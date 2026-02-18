import type { MessageDto } from '@chat/shared';
import { UserModel } from '../models/User';

export const toUserDto = (user: {
  _id: { toString(): string };
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl ?? undefined,
});

export const toMessageDto = async (
  message: {
    _id: { toString(): string };
    roomId: { toString(): string };
    userId: { toString(): string };
    text: string;
    createdAt: Date;
  },
): Promise<MessageDto> => {
  const user = await UserModel.findById(message.userId).lean();

  return {
    id: message._id.toString(),
    roomId: message.roomId.toString(),
    userId: message.userId.toString(),
    userDisplayName: user?.displayName ?? 'Unknown',
    userAvatarUrl: user?.avatarUrl ?? undefined,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  };
};
