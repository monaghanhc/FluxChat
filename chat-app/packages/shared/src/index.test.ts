import { describe, expect, it } from 'vitest';
import { signupSchema } from './index';

describe('shared schemas', () => {
  it('validates signup payload', () => {
    const parsed = signupSchema.parse({
      email: 'a@b.com',
      password: 'password123',
      displayName: 'Alice',
    });

    expect(parsed.email).toBe('a@b.com');
  });
});
