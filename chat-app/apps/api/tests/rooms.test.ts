import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { MessageModel } from '../src/models/Message';
import { MembershipModel } from '../src/models/Membership';
import { createUser } from './helpers/factories';

describe('rooms routes', () => {
  const app = createApp();

  it('lists creates and joins rooms', async () => {
    const { token } = await createUser();

    const createRoom = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'engineering' });

    expect(createRoom.status).toBe(201);
    expect(createRoom.body.room.name).toBe('engineering');

    const listBeforeJoin = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);

    expect(listBeforeJoin.status).toBe(200);
    expect(listBeforeJoin.body.rooms[0].joined).toBe(false);

    const join = await request(app)
      .post(`/api/rooms/${createRoom.body.room.id}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(join.status).toBe(201);

    const listAfterJoin = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);

    expect(listAfterJoin.body.rooms[0].joined).toBe(true);
  });

  it('returns unread count and clears it after mark-read', async () => {
    const { user: author, token: authorToken } = await createUser({
      email: 'author@example.com',
      displayName: 'Author',
    });
    const { token: readerToken } = await createUser({
      email: 'reader@example.com',
      displayName: 'Reader',
    });

    const createRoom = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ name: 'alerts' });

    expect(createRoom.status).toBe(201);
    const roomId = createRoom.body.room.id as string;

    const authorJoin = await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send();

    const readerJoin = await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${readerToken}`)
      .send();

    expect(authorJoin.status).toBe(201);
    expect(readerJoin.status).toBe(201);

    const oldReadTime = await MembershipModel.findOne({
      userId: readerJoin.body.membership.userId,
      roomId,
    }).lean();
    expect(oldReadTime).toBeTruthy();

    await request(app)
      .post(`/api/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ text: 'Reader should see this unread' })
      .expect(201);

    const readerRoomsBeforeRead = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${readerToken}`);

    const unreadRoom = readerRoomsBeforeRead.body.rooms.find((room: { id: string }) => room.id === roomId);
    expect(unreadRoom.unreadCount).toBe(1);

    const markRead = await request(app)
      .post(`/api/rooms/${roomId}/read`)
      .set('Authorization', `Bearer ${readerToken}`)
      .send();

    expect(markRead.status).toBe(200);

    const readerRoomsAfterRead = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${readerToken}`);

    const readRoom = readerRoomsAfterRead.body.rooms.find((room: { id: string }) => room.id === roomId);
    expect(readRoom.unreadCount).toBe(0);

    const newReadTime = await MembershipModel.findOne({ userId: readerJoin.body.membership.userId, roomId }).lean();
    expect(newReadTime).toBeTruthy();
    expect(new Date(newReadTime!.lastReadAt).getTime()).toBeGreaterThanOrEqual(
      new Date(oldReadTime!.lastReadAt).getTime(),
    );

    const authorMessages = await MessageModel.find({ roomId }).lean();
    expect(authorMessages).toHaveLength(1);
    expect(authorMessages[0].userId.toString()).toBe(author._id.toString());
  });

  it('rejects invalid room identifier on join', async () => {
    const { token } = await createUser();

    const response = await request(app)
      .post('/api/rooms/not-an-object-id/join')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ID');
  });
});
