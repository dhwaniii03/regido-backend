import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Set global API routing prefix
  app.setGlobalPrefix('api/v1');

  // Enable cookie parsing for HttpOnly dual-token session cookies
  app.use(cookieParser());

  // Enable CORS with credentials support
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  console.log(`🚀 Regidoo Backend Engine running on http://localhost:${port}/api/v1`);
}
void bootstrap();
