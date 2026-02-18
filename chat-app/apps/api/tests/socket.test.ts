import http from 'node:http';
import { io as clientIo, type Socket } from 'socket.io-client';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createSocketServer } from '../src/socket/index';
import { createRoomAndMembership, createUser } from './helpers/factories';

type TestClientSocket = Socket<
  {
    'room:presence': (payload: { roomId: string; usersOnline: Array<{ id: string }> }) => void;
    'message:new': (payload: { roomId: string; message: { text: string } }) => void;
  },
  {
    'room:join': (payload: { roomId: string }) => void;
    'message:send': (payload: { roomId: string; text: string; tempId?: string }) => void;
  }
>;

const waitForEvent = <T>(socket: Socket, event: string): Promise<T> => {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
};

describe('socket realtime', () => {
  it('connects, emits presence, and broadcasts messages', async () => {
    const app = createApp();
    const server = http.createServer(app);
    createSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server did not start');
    }

    const { user, token } = await createUser({ email: 'socket@example.com' });
    const room = await createRoomAndMembership(user._id.toString(), 'socket-room');

    const socket = clientIo(`http://127.0.0.1:${address.port}`, {
      auth: { token },
      transports: ['websocket'],
    }) as TestClientSocket;

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });

    const presencePromise = waitForEvent<{ roomId: string; usersOnline: Array<{ id: string }> }>(
      socket,
      'room:presence',
    );
    socket.emit('room:join', { roomId: room._id.toString() });
    const presence = await presencePromise;

    expect(presence.roomId).toBe(room._id.toString());
    expect(presence.usersOnline[0].id).toBe(user._id.toString());

    const messagePromise = waitForEvent<{ roomId: string; message: { text: string } }>(
      socket,
      'message:new',
    );

    socket.emit('message:send', { roomId: room._id.toString(), text: 'realtime hello', tempId: 't-1' });
    const newMessage = await messagePromise;

    expect(newMessage.roomId).toBe(room._id.toString());
    expect(newMessage.message.text).toBe('realtime hello');

    socket.disconnect();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });
});
