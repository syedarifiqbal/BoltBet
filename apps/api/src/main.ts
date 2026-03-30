import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigType } from '@nestjs/config';
import { redisConfig } from './config';
import { RedisIoAdapter } from './realtime/RedisIoAdapter';
import { AppModule } from './AppModule';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Required for graceful shutdown — triggers OnModuleDestroy on all providers
  // when SIGTERM is received. Without this, the process exits immediately,
  // potentially leaving in-flight RabbitMQ messages unacknowledged.
  app.enableShutdownHooks();

  // Redis-backed Socket.io adapter — routes all server.emit() calls through
  // Redis Pub/Sub so every server instance broadcasts to its own connected clients.
  // This makes broadcasts correct across multiple instances behind a load balancer.
  const config = app.get<ConfigType<typeof redisConfig>>(redisConfig.KEY);
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(config.ephemeralUrl);
  app.useWebSocketAdapter(redisIoAdapter);

  // ── Swagger ──────────────────────────────────────────────────────────────
  // Available at /api in development only. Never expose in production.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('BoltBet API')
      .setDescription('High-concurrency real-time betting and odds engine')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Parse cookies — required for reading the HttpOnly refresh_token cookie.
  app.use(cookieParser());

  // Global validation pipe — validates all incoming request bodies against
  // DTO class-validator decorators. whitelist: true strips unknown properties.
  // transform: true converts plain JSON to class instances (enables @Transform).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
