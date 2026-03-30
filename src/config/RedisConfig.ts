import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  url: string;
  ephemeralUrl: string;
}

/**
 * Two Redis instances, two different durability contracts:
 *
 *   url          → persistent Redis (AOF + RDB)
 *                  Used for: blacklist:jti:*, idempotency:*, circuit breaker state
 *                  Data loss here = security or correctness violation
 *
 *   ephemeralUrl → ephemeral Redis (RDB only, allkeys-lru eviction)
 *                  Used for: rate limit counters, odds cache, Socket.io adapter
 *                  Data loss here = degraded UX, never a correctness violation
 *
 * See docs/redis.md for the full topology and persistence strategy.
 */
export default registerAs(
  'redis',
  (): RedisConfig => ({
    url: process.env.REDIS_URL!,
    ephemeralUrl: process.env.REDIS_EPHEMERAL_URL!,
  }),
);
