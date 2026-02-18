import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginSchema, signupSchema } from '@chat/shared';
import { AppError } from '../lib/app-error';
import { asyncHandler } from '../lib/async-handler';
import { signJwt } from '../lib/jwt';
import { UserModel } from '../models/User';
import { requireAuth } from '../middleware/auth';
import type { AuthedRequest } from '../types/express';
import { toUserDto } from '../lib/dto';

export const authRouter = Router();

authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const payload = signupSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      throw new AppError(409, 'EMAIL_TAKEN', 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await UserModel.create({
      email,
      passwordHash,
      displayName: payload.displayName,
    });

    const token = signJwt({ userId: user._id.toString(), email: user.email });

    res.status(201).json({
      token,
      user: toUserDto(user),
    });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const token = signJwt({ userId: user._id.toString(), email: user.email });

    res.json({
      token,
      user: toUserDto(user),
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authedReq = req as AuthedRequest;
    const user = await UserModel.findById(authedReq.user.userId).lean();
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }

    res.json({ user: toUserDto(user) });
  }),
);
