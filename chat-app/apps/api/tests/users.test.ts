import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createUser } from './helpers/factories';

describe('users routes', () => {
  const app = createApp();

  it('updates display name and avatar', async () => {
    const { token } = await createUser({
      email: 'profile@example.com',
      displayName: 'Original Name',
    });

    const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Updated Name',
        avatarBase64: avatar,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.displayName).toBe('Updated Name');
    expect(response.body.user.avatarUrl).toBe(avatar);
  });

  it('rejects invalid avatar data URL', async () => {
    const { token } = await createUser({ email: 'invalid-avatar@example.com' });

    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Still Valid',
        avatarBase64: 'not-a-data-url',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_AVATAR');
  });

  it('requires auth for profile updates', async () => {
    const response = await request(app).put('/api/users/me').send({ displayName: 'No Auth' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
