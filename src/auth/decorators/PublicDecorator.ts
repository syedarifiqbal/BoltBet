import { SetMetadata } from '@nestjs/common';

/**
 * Mark a route as public — JwtAuthGuard will skip token validation.
 *
 * JwtAuthGuard is applied globally via APP_GUARD. Use @Public() to opt out:
 *   POST /v1/auth/register
 *   POST /v1/auth/login
 *   POST /v1/auth/refresh   (uses the HttpOnly cookie, not a Bearer token)
 *   GET  /health
 *
 * Never apply @Public() to routes that handle money or user data.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
