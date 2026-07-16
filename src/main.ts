import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  const origin = config.getOrThrow<string>('FRONTEND_URL');
  const port = config.getOrThrow<number>('PORT');

  app.enableCors({
    origin: origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-HTTP-Method-Override',
      'X-Token',
    ],
    exposedHeaders: ['set-cookie', 'X-Token'],
  });

  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/api`,
    'Bootstrap',
  );
}
void bootstrap();
