import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './AppModule';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Required for graceful shutdown — triggers OnModuleDestroy on all providers
  // when SIGTERM is received. Without this, the process exits immediately,
  // potentially leaving in-flight RabbitMQ messages unacknowledged.
  app.enableShutdownHooks();

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
