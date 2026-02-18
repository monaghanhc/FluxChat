export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_URL;

const TOKEN_KEY = 'fluxchat.token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};
