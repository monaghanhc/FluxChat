import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject } from 'zod';
import { AppError } from '../lib/app-error';

export const validateBody = (schema: AnyZodObject) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request body', error.flatten()));
      }
      next(error);
    }
  };
};
