import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './AppModule';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Required for graceful shutdown — triggers OnModuleDestroy on all providers
  // when SIGTERM is received. Without this, the process exits immediately,
  // potentially leaving in-flight RabbitMQ messages unacknowledged.
  app.enableShutdownHooks();

  // Socket.io adapter — enables WebSocket support on the same HTTP server.
  app.useWebSocketAdapter(new IoAdapter(app));

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
