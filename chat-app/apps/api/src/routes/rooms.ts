import { Router } from 'express';
import mongoose from 'mongoose';
import { createRoomSchema, paginationSchema, sendMessageSchema } from '@chat/shared';
import { asyncHandler } from '../lib/async-handler';
import { AppError } from '../lib/app-error';
import { requireAuth } from '../middleware/auth';
import type { AuthedRequest } from '../types/express';
import { RoomModel } from '../models/Room';
import { MembershipModel } from '../models/Membership';
import { MessageModel } from '../models/Message';
import { sanitizeMessageText } from '../lib/sanitize';
import { toMessageDto } from '../lib/dto';

const DEFAULT_MESSAGE_PAGE_SIZE = 20;

const toObjectId = (value: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid identifier');
  }
  return new mongoose.Types.ObjectId(value);
};

export const roomsRouter = Router();

roomsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = toObjectId((req as AuthedRequest).user.userId);

    const [rooms, memberships] = await Promise.all([
      RoomModel.find({ isPublic: true }).sort({ name: 1 }).lean(),
      MembershipModel.find({ userId }).lean(),
    ]);

    const membershipByRoomId = new Map(memberships.map((m) => [m.roomId.toString(), m]));

    const roomSummaries = await Promise.all(
      rooms.map(async (room) => {
        const membership = membershipByRoomId.get(room._id.toString());
        let unreadCount = 0;

        if (membership) {
          unreadCount = await MessageModel.countDocuments({
            roomId: room._id,
            createdAt: { $gt: membership.lastReadAt },
            userId: { $ne: userId },
          });
        }

        return {
          id: room._id.toString(),
          name: room.name,
          isPublic: room.isPublic,
          joined: Boolean(membership),
          unreadCount,
        };
      }),
    );

    res.json({ rooms: roomSummaries });
  }),
);

roomsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = createRoomSchema.parse(req.body);

    const existing = await RoomModel.findOne({ name: payload.name.trim() }).lean();
    if (existing) {
      throw new AppError(409, 'ROOM_EXISTS', 'Room already exists');
    }

    const room = await RoomModel.create({
      name: payload.name.trim(),
      isPublic: true,
    });

    res.status(201).json({
      room: {
        id: room._id.toString(),
        name: room.name,
        isPublic: room.isPublic,
      },
    });
  }),
);

roomsRouter.post(
  '/:roomId/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = toObjectId((req as AuthedRequest).user.userId);
    const roomId = toObjectId(req.params.roomId);

    const room = await RoomModel.findById(roomId).lean();
    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found');
    }

    const membership = await MembershipModel.findOneAndUpdate(
      { userId, roomId },
      { $setOnInsert: { userId, roomId, lastReadAt: new Date() } },
      { upsert: true, new: true },
    ).lean();

    res.status(201).json({
      membership: {
        id: membership?._id.toString(),
        userId: userId.toString(),
        roomId: roomId.toString(),
      },
    });
  }),
);

roomsRouter.get(
  '/:roomId/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const roomId = toObjectId(req.params.roomId);
    const userId = toObjectId((req as AuthedRequest).user.userId);

    const membership = await MembershipModel.findOne({ userId, roomId }).lean();
    if (!membership) {
      throw new AppError(403, 'ROOM_ACCESS_DENIED', 'Join room first');
    }

    const parsedQuery = paginationSchema.parse(req.query);
    const limit = parsedQuery.limit ?? DEFAULT_MESSAGE_PAGE_SIZE;
    const beforeDate = parsedQuery.before ? new Date(parsedQuery.before) : null;

    const query: Record<string, unknown> = { roomId };
    if (beforeDate) {
      query.createdAt = { $lt: beforeDate };
    }

    const messages = await MessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const ordered = [...messages].reverse();

    const messageDtos = await Promise.all(
      ordered.map(async (message) =>
        toMessageDto({
          ...message,
          _id: message._id.toString(),
          roomId: message.roomId.toString(),
          userId: message.userId.toString(),
        } as any),
      ),
    );

    res.json({
      messages: messageDtos,
      hasMore: messages.length === limit,
    });
  }),
);

roomsRouter.post(
  '/:roomId/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const roomId = toObjectId(req.params.roomId);
    const userId = toObjectId((req as AuthedRequest).user.userId);

    const parsed = sendMessageSchema.parse({
      roomId: req.params.roomId,
      text: req.body.text,
      tempId: req.body.tempId,
    });

    const membership = await MembershipModel.findOne({ userId, roomId }).lean();
    if (!membership) {
      throw new AppError(403, 'ROOM_ACCESS_DENIED', 'Join room first');
    }

    const sanitizedText = sanitizeMessageText(parsed.text);
    if (!sanitizedText) {
      throw new AppError(400, 'INVALID_MESSAGE', 'Message cannot be empty');
    }

    const message = await MessageModel.create({
      roomId,
      userId,
      text: sanitizedText,
    });

    await MembershipModel.findOneAndUpdate(
      { userId, roomId },
      { $set: { lastReadAt: new Date() } },
    );

    const messageDto = await toMessageDto(message as any);

    res.status(201).json({ message: messageDto });
  }),
);

roomsRouter.post(
  '/:roomId/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const roomId = toObjectId(req.params.roomId);
    const userId = toObjectId((req as AuthedRequest).user.userId);

    const membership = await MembershipModel.findOneAndUpdate(
      { userId, roomId },
      { $set: { lastReadAt: new Date() } },
      { new: true },
    ).lean();

    if (!membership) {
      throw new AppError(403, 'ROOM_ACCESS_DENIED', 'Join room first');
    }

    res.json({
      membership: {
        roomId: roomId.toString(),
        lastReadAt: membership.lastReadAt.toISOString(),
      },
    });
  }),
);
