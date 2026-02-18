import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { checkMessageRateLimit, resetMessageRateLimiter } from '../src/lib/message-rate-limit';

describe('message rate limiter', () => {
  beforeEach(() => {
    resetMessageRateLimiter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMessageRateLimiter();
  });

  it('limits repeated sends and resets after window', () => {
    const userId = 'user-1';

    for (let index = 0; index < 10; index += 1) {
      expect(checkMessageRateLimit(userId)).toBe(true);
    }

    expect(checkMessageRateLimit(userId)).toBe(false);

    vi.advanceTimersByTime(5_001);

    expect(checkMessageRateLimit(userId)).toBe(true);
  });

  it('tracks users independently', () => {
    for (let index = 0; index < 10; index += 1) {
      expect(checkMessageRateLimit('user-a')).toBe(true);
    }

    expect(checkMessageRateLimit('user-a')).toBe(false);
    expect(checkMessageRateLimit('user-b')).toBe(true);
  });
});
