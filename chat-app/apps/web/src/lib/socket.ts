import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from './env';

type SocketServerEvents = {
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

type SocketClientEvents = {
  'room:join': (payload: { roomId: string }) => void;
  'room:leave': (payload: { roomId: string }) => void;
  'message:send': (payload: { roomId: string; text: string; tempId?: string }) => void;
  'typing:start': (payload: { roomId: string }) => void;
  'typing:stop': (payload: { roomId: string }) => void;
};

export type FluxSocket = Socket<SocketServerEvents, SocketClientEvents>;

export const createSocket = (token: string): FluxSocket => {
  return io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
  });
};
