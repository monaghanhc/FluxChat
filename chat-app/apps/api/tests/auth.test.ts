import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('auth routes', () => {
  const app = createApp();

  it('supports signup login and me', async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      email: 'alice@example.com',
      password: 'password123',
      displayName: 'Alice',
    });

    expect(signup.status).toBe(201);
    expect(signup.body.token).toBeDefined();

    const login = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('alice@example.com');
  });

  it('rejects duplicate signup and invalid login', async () => {
    const payload = {
      email: 'taken@example.com',
      password: 'password123',
      displayName: 'Taken User',
    };

    const firstSignup = await request(app).post('/api/auth/signup').send(payload);
    expect(firstSignup.status).toBe(201);

    const duplicateSignup = await request(app).post('/api/auth/signup').send(payload);
    expect(duplicateSignup.status).toBe(409);
    expect(duplicateSignup.body.error.code).toBe('EMAIL_TAKEN');

    const invalidLogin = await request(app).post('/api/auth/login').send({
      email: payload.email,
      password: 'wrong-password',
    });
    expect(invalidLogin.status).toBe(401);
    expect(invalidLogin.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('requires bearer token for /me', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
