import dotenv from 'dotenv';

dotenv.config();

const parseCsv = (value: string | undefined, fallback: string): string[] => {
  return (value ?? fallback)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/fluxchat',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigins: parseCsv(
    process.env.CLIENT_ORIGIN,
    'http://localhost:5173,http://127.0.0.1:5173',
  ),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
  messageRateLimitWindowMs: Number(process.env.MESSAGE_RATE_LIMIT_WINDOW_MS ?? 5_000),
  messageRateLimitMax: Number(process.env.MESSAGE_RATE_LIMIT_MAX ?? 10),
};
