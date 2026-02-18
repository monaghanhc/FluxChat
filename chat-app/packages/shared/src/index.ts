import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(40),
});

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9-_ ]+$/),
});

export const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  tempId: z.string().min(1).optional(),
  text: z.string().min(1).max(500),
});

export const roomJoinSchema = z.object({
  roomId: z.string().min(1),
});

export const paginationSchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(40).optional(),
  avatarBase64: z.string().max(2_000_000).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type RoomJoinInput = z.infer<typeof roomJoinSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
};

export type RoomSummary = {
  id: string;
  name: string;
  isPublic: boolean;
  joined: boolean;
  unreadCount: number;
};

export type MessageDto = {
  id: string;
  roomId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: string;
};
