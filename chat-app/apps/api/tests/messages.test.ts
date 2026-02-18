import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { MembershipModel } from '../src/models/Membership';
import { createRoomAndMembership, createUser } from './helpers/factories';

describe('messages routes', () => {
  const app = createApp();

  it('sends messages and paginates history', async () => {
    const { user, token } = await createUser();
    const room = await createRoomAndMembership(user._id.toString(), 'ops');

    const send1 = await request(app)
      .post(`/api/rooms/${room._id.toString()}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'hello one' });

    const send2 = await request(app)
      .post(`/api/rooms/${room._id.toString()}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'hello two' });

    expect(send1.status).toBe(201);
    expect(send2.status).toBe(201);

    const page1 = await request(app)
      .get(`/api/rooms/${room._id.toString()}/messages?limit=1`)
      .set('Authorization', `Bearer ${token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.messages).toHaveLength(1);
    expect(page1.body.hasMore).toBe(true);

    const before = page1.body.messages[0].createdAt;

    const page2 = await request(app)
      .get(`/api/rooms/${room._id.toString()}/messages?limit=10&before=${encodeURIComponent(before)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('sanitizes message text and updates membership read timestamp', async () => {
    const { user, token } = await createUser({ email: 'sanitize@example.com' });
    const room = await createRoomAndMembership(user._id.toString(), 'sanitize-room');

    const beforeReadAt = await MembershipModel.findOne({ userId: user._id, roomId: room._id }).lean();

    const send = await request(app)
      .post(`/api/rooms/${room._id.toString()}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '   hello     from  sanitize   ' });

    expect(send.status).toBe(201);
    expect(send.body.message.text).toBe('hello from sanitize');

    const afterReadAt = await MembershipModel.findOne({ userId: user._id, roomId: room._id }).lean();
    expect(afterReadAt).toBeTruthy();
    expect(new Date(afterReadAt!.lastReadAt).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeReadAt!.lastReadAt).getTime(),
    );
  });

  it('rejects sending message for user not in room', async () => {
    const { user: owner } = await createUser({ email: 'owner@example.com' });
    const { token: outsiderToken } = await createUser({ email: 'outsider@example.com' });
    const room = await createRoomAndMembership(owner._id.toString(), 'private-ish');

    const send = await request(app)
      .post(`/api/rooms/${room._id.toString()}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ text: 'Not allowed' });

    expect(send.status).toBe(403);
    expect(send.body.error.code).toBe('ROOM_ACCESS_DENIED');
  });

  it('rejects empty sanitized message', async () => {
    const { user, token } = await createUser({ email: 'empty-msg@example.com' });
    const room = await createRoomAndMembership(user._id.toString(), 'empty-message-room');

    const send = await request(app)
      .post(`/api/rooms/${room._id.toString()}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '        ' });

    expect(send.status).toBe(400);
    expect(send.body.error.code).toBe('INVALID_MESSAGE');
  });
});
