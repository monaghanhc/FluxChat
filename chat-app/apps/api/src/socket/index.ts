import type http from 'node:http';
import { Server } from 'socket.io';
import { roomJoinSchema, sendMessageSchema } from '@chat/shared';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { verifyJwt } from '../lib/jwt.js';
import { UserModel } from '../models/User.js';
import { RoomModel } from '../models/Room.js';
import { MembershipModel } from '../models/Membership.js';
import { MessageModel } from '../models/Message.js';
import { sanitizeMessageText } from '../lib/sanitize.js';
import { checkMessageRateLimit } from '../lib/message-rate-limit.js';

type SocketAuthedUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
};

type ServerToClientEvents = {
  'room:presence': (payload: {
    roomId: string;
    usersOnline: Array<{ id: string; displayName: string; avatarUrl?: string }>;
  }) => void;
  'typing:update': (payload: { roomId: string; usersTyping: string[] }) => void;
  'message:new': (payload: {
    roomId: string;
    message: {
      id: string;
      roomId: string;
      userId: string;
      userDisplayName: string;
      userAvatarUrl?: string;
      text: string;
      createdAt: string;
    };
  }) => void;
  'message:ack': (payload: {
    tempId?: string;
    message?: {
      id: string;
      roomId: string;
      userId: string;
      userDisplayName: string;
      userAvatarUrl?: string;
      text: string;
      createdAt: string;
    };
    error?: string;
  }) => void;
  'room:error': (payload: { message: string }) => void;
};

type ClientToServerEvents = {
  'room:join': (payload: { roomId: string }) => void;
  'room:leave': (payload: { roomId: string }) => void;
  'message:send': (payload: { roomId: string; text: string; tempId?: string }) => void;
  'typing:start': (payload: { roomId: string }) => void;
  'typing:stop': (payload: { roomId: string }) => void;
};

type SocketData = {
  user: SocketAuthedUser;
};

const roomPresenceMap = new Map<string, Map<string, number>>();
const roomTypingMap = new Map<string, Set<string>>();
const socketRoomsMap = new Map<string, Set<string>>();

const parseBearer = (value: string): string => {
  return value.startsWith('Bearer ') ? value.slice(7) : value;
};

const ensureObjectId = (value: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(value);
};

const addPresence = (socketId: string, roomId: string, userId: string): void => {
  if (!socketRoomsMap.has(socketId)) {
    socketRoomsMap.set(socketId, new Set());
  }
  socketRoomsMap.get(socketId)?.add(roomId);

  if (!roomPresenceMap.has(roomId)) {
    roomPresenceMap.set(roomId, new Map());
  }

  const presence = roomPresenceMap.get(roomId);
  const count = presence?.get(userId) ?? 0;
  presence?.set(userId, count + 1);
};

const removePresence = (socketId: string, roomId: string, userId: string): void => {
  socketRoomsMap.get(socketId)?.delete(roomId);
  if (socketRoomsMap.get(socketId)?.size === 0) {
    socketRoomsMap.delete(socketId);
  }

  const roomPresence = roomPresenceMap.get(roomId);
  if (!roomPresence) {
    return;
  }

  const nextCount = (roomPresence.get(userId) ?? 1) - 1;
  if (nextCount <= 0) {
    roomPresence.delete(userId);
  } else {
    roomPresence.set(userId, nextCount);
  }

  if (roomPresence.size === 0) {
    roomPresenceMap.delete(roomId);
  }
};

const emitPresence = async (
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  roomId: string,
): Promise<void> => {
  const userIds = [...(roomPresenceMap.get(roomId)?.keys() ?? [])];

  if (userIds.length === 0) {
    io.to(roomId).emit('room:presence', { roomId, usersOnline: [] });
    return;
  }

  const users = await UserModel.find({ _id: { $in: userIds } }).lean();

  io.to(roomId).emit('room:presence', {
    roomId,
    usersOnline: users.map((user) => ({
      id: user._id.toString(),
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
    })),
  });
};

const emitTyping = (
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  roomId: string,
): void => {
  io.to(roomId).emit('typing:update', {
    roomId,
    usersTyping: [...(roomTypingMap.get(roomId) ?? new Set())],
  });
};

export const resetSocketState = (): void => {
  roomPresenceMap.clear();
  roomTypingMap.clear();
  socketRoomsMap.clear();
};

export const createSocketServer = (httpServer: http.Server) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: {
        origin: config.clientOrigins,
        credentials: false,
      },
    },
  );

  io.use(async (socket, next) => {
    try {
      const tokenFromAuth = socket.handshake.auth.token;
      const authHeader = socket.handshake.headers.authorization;
      const token =
        typeof tokenFromAuth === 'string'
          ? parseBearer(tokenFromAuth)
          : typeof authHeader === 'string'
            ? parseBearer(authHeader)
            : null;

      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }

      const jwtPayload = verifyJwt(token);
      const user = await UserModel.findById(jwtPayload.userId).lean();
      if (!user) {
        next(new Error('Unauthorized'));
        return;
      }

      socket.data.user = {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? undefined,
      };

      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ roomId }) => {
      try {
        const parsed = roomJoinSchema.parse({ roomId });
        const roomObjectId = ensureObjectId(parsed.roomId);
        const room = await RoomModel.findById(roomObjectId).lean();
        if (!room || !room.isPublic) {
          socket.emit('room:error', { message: 'Room not found' });
          return;
        }

        await MembershipModel.findOneAndUpdate(
          {
            userId: ensureObjectId(socket.data.user.id),
            roomId: roomObjectId,
          },
          {
            $setOnInsert: {
              userId: ensureObjectId(socket.data.user.id),
              roomId: roomObjectId,
            },
            $set: { lastReadAt: new Date() },
          },
          { upsert: true },
        );

        socket.join(parsed.roomId);
        addPresence(socket.id, parsed.roomId, socket.data.user.id);
        await emitPresence(io, parsed.roomId);
      } catch {
        socket.emit('room:error', { message: 'Invalid room payload' });
      }
    });

    socket.on('room:leave', async ({ roomId }) => {
      socket.leave(roomId);
      removePresence(socket.id, roomId, socket.data.user.id);

      const typingUsers = roomTypingMap.get(roomId);
      typingUsers?.delete(socket.data.user.id);
      if (typingUsers && typingUsers.size === 0) {
        roomTypingMap.delete(roomId);
      }

      await emitPresence(io, roomId);
      emitTyping(io, roomId);
    });

    socket.on('typing:start', ({ roomId }) => {
      if (!socketRoomsMap.get(socket.id)?.has(roomId)) {
        return;
      }

      if (!roomTypingMap.has(roomId)) {
        roomTypingMap.set(roomId, new Set());
      }

      roomTypingMap.get(roomId)?.add(socket.data.user.id);
      emitTyping(io, roomId);
    });

    socket.on('typing:stop', ({ roomId }) => {
      roomTypingMap.get(roomId)?.delete(socket.data.user.id);
      if (roomTypingMap.get(roomId)?.size === 0) {
        roomTypingMap.delete(roomId);
      }
      emitTyping(io, roomId);
    });

    socket.on('message:send', async ({ roomId, text, tempId }) => {
      try {
        const payload = sendMessageSchema.parse({ roomId, text, tempId });

        if (!checkMessageRateLimit(socket.data.user.id)) {
          socket.emit('message:ack', { tempId, error: 'Rate limit exceeded' });
          return;
        }

        const roomObjectId = ensureObjectId(payload.roomId);
        const userObjectId = ensureObjectId(socket.data.user.id);

        const membership = await MembershipModel.findOne({
          userId: userObjectId,
          roomId: roomObjectId,
        }).lean();

        if (!membership) {
          socket.emit('message:ack', { tempId, error: 'Join room first' });
          return;
        }

        const sanitizedText = sanitizeMessageText(payload.text);
        if (!sanitizedText) {
          socket.emit('message:ack', { tempId, error: 'Message cannot be empty' });
          return;
        }

        const message = await MessageModel.create({
          roomId: roomObjectId,
          userId: userObjectId,
          text: sanitizedText,
        });

        await MembershipModel.findOneAndUpdate(
          { userId: userObjectId, roomId: roomObjectId },
          { $set: { lastReadAt: new Date() } },
        );

        const messageDto = {
          id: message._id.toString(),
          roomId: payload.roomId,
          userId: socket.data.user.id,
          userDisplayName: socket.data.user.displayName,
          userAvatarUrl: socket.data.user.avatarUrl,
          text: message.text,
          createdAt: message.createdAt.toISOString(),
        };

        io.to(payload.roomId).emit('message:new', {
          roomId: payload.roomId,
          message: messageDto,
        });

        socket.emit('message:ack', { tempId: payload.tempId, message: messageDto });
      } catch {
        socket.emit('message:ack', { tempId, error: 'Invalid message payload' });
      }
    });

    socket.on('disconnect', async () => {
      const rooms = [...(socketRoomsMap.get(socket.id) ?? new Set())];
      for (const roomId of rooms) {
        removePresence(socket.id, roomId, socket.data.user.id);
        roomTypingMap.get(roomId)?.delete(socket.data.user.id);
        if (roomTypingMap.get(roomId)?.size === 0) {
          roomTypingMap.delete(roomId);
        }

        await emitPresence(io, roomId);
        emitTyping(io, roomId);
      }
    });
  });

  return io;
};

