import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisConfig } from '../config';
import { RedisService } from './redis.service';

/**
 * Global Redis module — imported once in AppModule, available everywhere.
 * Any service can inject RedisService without re-importing this module.
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
