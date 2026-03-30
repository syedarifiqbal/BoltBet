import type { NextConfig } from 'next';

/**
 * Next.js rewrites proxy all /v1/* requests to the NestJS API.
 *
 * Why rewrites instead of direct API calls?
 *  - No CORS config needed — browser sees same-origin requests
 *  - HttpOnly refresh token cookie works correctly (set on same origin)
 *  - In production, Nginx handles this — zero config change needed
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3000'}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
