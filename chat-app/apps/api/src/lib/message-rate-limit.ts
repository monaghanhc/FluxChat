import { config } from '../config.js';

const messageHistory = new Map<string, number[]>();

export const checkMessageRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const cutoff = now - config.messageRateLimitWindowMs;
  const existing = messageHistory.get(userId) ?? [];
  const pruned = existing.filter((timestamp) => timestamp >= cutoff);

  if (pruned.length >= config.messageRateLimitMax) {
    messageHistory.set(userId, pruned);
    return false;
  }

  pruned.push(now);
  messageHistory.set(userId, pruned);
  return true;
};

export const resetMessageRateLimiter = (): void => {
  messageHistory.clear();
};

