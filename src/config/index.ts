/**
 * Barrel export for all config namespaces.
 * Import from here, not directly from individual config files.
 *
 * Usage in a service:
 *
 *   import { appConfig, rabbitmqConfig } from '../config';
 *   import { ConfigType } from '@nestjs/config';
 *
 *   constructor(
 *     @Inject(rabbitmqConfig.KEY)
 *     private readonly config: ConfigType<typeof rabbitmqConfig>,
 *   ) {}
 *
 *   // this.config.url  ← fully typed, no magic strings
 */
export { default as appConfig } from './app.config';
export { default as rabbitmqConfig } from './rabbitmq.config';
export { default as databaseConfig } from './database.config';
export { default as redisConfig } from './redis.config';
export { default as jwtConfig } from './jwt.config';
export { default as securityConfig } from './security.config';
export { validationSchema, validationOptions } from './env.validation';
