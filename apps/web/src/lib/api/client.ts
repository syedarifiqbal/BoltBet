/**
 * API client — the single fetch wrapper used by every API function.
 *
 * Responsibilities:
 *  1. Attach Bearer token from Redux store to every request
 *  2. On 401, silently refresh the token and retry the original request once
 *  3. On refresh failure, dispatch logout and throw so callers can redirect
 *
 * Why a custom fetch wrapper instead of axios?
 *  Next.js 15 has excellent native fetch support (caching, deduplication).
 *  A thin wrapper keeps us aligned with the framework without adding axios overhead.
 *
 * Store injection:
 *  We import the store directly to avoid prop-drilling the token through every
 *  component. This is the standard RTK pattern for non-component code.
 */

import { store } from '@/store';
import { setCredentials, clearCredentials } from '@/store/slices/AuthSlice';
import { decodeToken } from '@/lib/utils';

type RequestOptions = RequestInit & {
  skipAuth?: boolean; // set true for login/register/refresh endpoints
};

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const makeRequest = async (token: string | null): Promise<Response> => {
    return fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
        ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include', // send HttpOnly refresh cookie on same-origin requests
    });
  };

  const currentToken = store.getState().auth.accessToken;
  let response = await makeRequest(currentToken);

  // ── Silent token refresh on 401 ────────────────────────────────────────────
  // If the access token expired, try to get a new one using the HttpOnly
  // refresh cookie. If that succeeds, retry the original request once.
  if (response.status === 401 && !skipAuth) {
    const refreshResponse = await fetch('/v1/auth/refresh', {
      method:      'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json() as { accessToken: string };
      const user = decodeToken(data.accessToken);

      store.dispatch(setCredentials({ accessToken: data.accessToken, user }));

      // Retry with the new token
      response = await makeRequest(data.accessToken);
    } else {
      // Refresh failed — session is gone, clear auth state
      store.dispatch(clearCredentials());
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new ApiError(response.status, body.message ?? `Request failed: ${response.status}`);
  }

  // No body responses (204 No Content, or 201/200 with empty body)
  const contentLength = response.headers.get('content-length');
  const contentType   = response.headers.get('content-type') ?? '';
  if (
    response.status === 204 ||
    contentLength === '0' ||
    !contentType.includes('application/json')
  ) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};
