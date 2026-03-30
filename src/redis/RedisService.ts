import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConfig } from '../config';

/**
 * Provides two ioredis clients matching the dual-Redis topology from Phase 1.
 *
 * persistent — AOF+RDB, noeviction (port 6379)
 *   Use for: JWT blacklist (blacklist:jti:*), idempotency keys, circuit breaker state
 *   Data loss here = correctness violation (revoked tokens could be accepted again)
 *
 * ephemeral  — RDB only, allkeys-lru (port 6380)
 *   Use for: rate limit counters, odds cache, Socket.io adapter
 *   Data loss here = acceptable (counters reset, cache rebuilds)
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _persistent!: Redis;
  private _ephemeral!: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>,
  ) {}

  onModuleInit(): void {
    this._persistent = new Redis(this.config.url, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
    this._ephemeral = new Redis(this.config.ephemeralUrl, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this._persistent.on('error', (err) =>
      this.logger.error('Redis persistent connection error', err),
    );
    this._ephemeral.on('error', (err) =>
      this.logger.error('Redis ephemeral connection error', err),
    );

    this.logger.log('Redis clients initialised');
  }

  async onModuleDestroy(): Promise<void> {
    await this._persistent.quit();
    await this._ephemeral.quit();
    this.logger.log('Redis clients closed');
  }

  get persistent(): Redis {
    return this._persistent;
  }

  get ephemeral(): Redis {
    return this._ephemeral;
  }
}
