import type { AuthResponse, MessageDto, RoomSummary } from '@chat/shared';
import { API_URL } from './env';

export type ApiUser = AuthResponse['user'];

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  token?: string;
  body?: unknown;
};

class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const request = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorPayload = (data.error ?? {}) as { code?: string; message?: string };
    throw new ApiClientError(
      response.status,
      errorPayload.code ?? 'REQUEST_FAILED',
      errorPayload.message ?? 'Request failed',
    );
  }

  return data as T;
};

export const api = {
  signup: (payload: { email: string; password: string; displayName: string }) =>
    request<AuthResponse>('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: payload }),
  me: (token: string) => request<{ user: ApiUser }>('/api/auth/me', { token }),
  updateProfile: (
    token: string,
    payload: {
      displayName?: string;
      avatarBase64?: string;
    },
  ) => request<{ user: ApiUser }>('/api/users/me', { method: 'PUT', token, body: payload }),
  listRooms: (token: string) => request<{ rooms: RoomSummary[] }>('/api/rooms', { token }),
  createRoom: (token: string, name: string) =>
    request<{ room: { id: string; name: string; isPublic: boolean } }>('/api/rooms', {
      method: 'POST',
      token,
      body: { name },
    }),
  joinRoom: (token: string, roomId: string) =>
    request<{ membership: { id: string; userId: string; roomId: string } }>(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      token,
    }),
  listMessages: (token: string, roomId: string, before?: string, limit = 20) =>
    request<{ messages: MessageDto[]; hasMore: boolean }>(
      `/api/rooms/${roomId}/messages?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`,
      {
        token,
      },
    ),
  markRead: (token: string, roomId: string) =>
    request<{ membership: { roomId: string; lastReadAt: string } }>(`/api/rooms/${roomId}/read`, {
      method: 'POST',
      token,
    }),
};

export const isApiClientError = (error: unknown): error is ApiClientError => {
  return error instanceof ApiClientError;
};
