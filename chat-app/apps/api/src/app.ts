import http from 'node:http';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { roomsRouter } from './routes/rooms.js';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/error-handler.js';
import { AppError } from './lib/app-error.js';

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new AppError(403, 'CORS_DENIED', 'Origin not allowed'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const authLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs,
  max: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth attempts, please try again later',
    },
  },
});

export const createApp = (): express.Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/users', usersRouter);

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  app.use(errorHandler);

  return app;
};

export const createHttpServer = (): { app: express.Express; server: http.Server } => {
  const app = createApp();
  const server = http.createServer(app);
  return { app, server };
};

