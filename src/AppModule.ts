import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  rabbitmqConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  securityConfig,
  validationSchema,
  validationOptions,
} from './config';
import { AppController } from './AppController';
import { AppService } from './AppService';
import { RabbitMQModule } from './rabbitmq/RabbitmqModule';
import { RedisModule } from './redis/RedisModule';
import { DatabaseModule } from './database/DatabaseModule';
import { AuthModule } from './auth/AuthModule';
import { IdentityModule } from './identity/IdentityModule';
import { WalletModule } from './wallet/WalletModule';
import { MarketModule } from './market/MarketModule';
import { BettingModule } from './betting/BettingModule';

@Module({
  imports: [
    /**
     * ConfigModule.forRoot is called once here in the root module.
     *
     * load: [...] registers all typed config namespaces. When a new phase
     * adds env vars, add the corresponding registerAs() config here.
     *
     * validationSchema: Joi validates all variables at startup.
     * The app refuses to start if any required variable is missing.
     * Fail fast > silent misconfiguration in production.
     *
     * cache: true — config values are cached after first read (O(1) lookups).
     * expandVariables — allows ${OTHER_VAR} references inside .env files.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      load: [appConfig, rabbitmqConfig, databaseConfig, redisConfig, jwtConfig, securityConfig],
      validationSchema,
      validationOptions,
      cache: true,
      expandVariables: true,
    }),
    RedisModule,
    DatabaseModule,
    AuthModule,
    RabbitMQModule,
    IdentityModule,
    WalletModule,
    MarketModule,
    BettingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
