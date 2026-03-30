import { apiClient } from './client';

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  email:    string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/v1/auth/login', payload, { skipAuth: true }),

  register: (payload: RegisterPayload) =>
    apiClient.post<void>('/v1/auth/register', payload, { skipAuth: true }),

  refresh: () =>
    apiClient.post<AuthResponse>('/v1/auth/refresh', undefined, { skipAuth: true }),

  logout: () =>
    apiClient.post<void>('/v1/auth/logout'),

  requestPasswordReset: (email: string) =>
    apiClient.post<void>('/v1/auth/password-reset/request', { email }, { skipAuth: true }),

  resetPassword: (token: string, password: string) =>
    apiClient.post<void>('/v1/auth/password-reset/confirm', { token, password }, { skipAuth: true }),
};
