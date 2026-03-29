import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, rabbitmqConfig, databaseConfig, redisConfig, validationSchema, validationOptions } from './config';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    /**
     * ConfigModule.forRoot is called once here in the root module.
     *
     * isGlobal: true   — ConfigService and all registered configs are injectable
     *                    everywhere without importing ConfigModule again.
     *
     * envFilePath       — loads .env.development (or .env.production) first,
     *                    then falls back to .env. Variables in the first file
     *                    that is found take precedence.
     *
     * load             — registers typed config namespaces ('app', 'rabbitmq').
     *                    Add new registerAs() configs here as phases progress.
     *
     * validationSchema — Joi schema that runs at startup. The app will throw
     *                    and exit if any required variable is missing or invalid.
     *                    Fail fast > silent misconfiguration in production.
     *
     * cache: true      — config values are cached after first read. Subsequent
     *                    calls to configService.get() are O(1) map lookups.
     *
     * expandVariables  — allows ${OTHER_VAR} references inside .env files.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      load: [appConfig, rabbitmqConfig, databaseConfig, redisConfig],
      validationSchema,
      validationOptions,
      cache: true,
      expandVariables: true,
    }),
    RabbitMQModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
