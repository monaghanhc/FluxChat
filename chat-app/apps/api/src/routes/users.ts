import { Router } from 'express';
import { updateProfileSchema } from '@chat/shared';
import { asyncHandler } from '../lib/async-handler';
import { AppError } from '../lib/app-error';
import { requireAuth } from '../middleware/auth';
import type { AuthedRequest } from '../types/express';
import { UserModel } from '../models/User';
import { isValidAvatarDataUrl } from '../lib/sanitize';
import { toUserDto } from '../lib/dto';

export const usersRouter = Router();

usersRouter.put(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = updateProfileSchema.parse(req.body);
    const authedReq = req as AuthedRequest;

    if (payload.avatarBase64 && !isValidAvatarDataUrl(payload.avatarBase64)) {
      throw new AppError(400, 'INVALID_AVATAR', 'Avatar must be a base64 image data URL');
    }

    const user = await UserModel.findByIdAndUpdate(
      authedReq.user.userId,
      {
        ...(payload.displayName ? { displayName: payload.displayName.trim() } : {}),
        ...(payload.avatarBase64 ? { avatarUrl: payload.avatarBase64 } : {}),
      },
      { new: true },
    ).lean();

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    res.json({ user: toUserDto(user) });
  }),
);
