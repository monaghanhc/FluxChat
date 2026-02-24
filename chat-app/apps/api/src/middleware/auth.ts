import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';
import { verifyJwt } from '../lib/jwt.js';
import type { AuthedRequest } from '../types/express.js';

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing bearer token'));
  }

  try {
    (req as AuthedRequest).user = verifyJwt(token);
    return next();
  } catch {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid token'));
  }
};

