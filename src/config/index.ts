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
export { default as appConfig } from './AppConfig';
export { default as rabbitmqConfig } from './RabbitmqConfig';
export { default as databaseConfig } from './DatabaseConfig';
export { default as redisConfig } from './RedisConfig';
export { default as jwtConfig } from './JwtConfig';
export { default as securityConfig } from './SecurityConfig';
export { validationSchema, validationOptions } from './EnvValidation';
