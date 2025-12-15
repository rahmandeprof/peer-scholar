// Sentry must be imported first before any other modules
import './instrument';
import * as Sentry from '@sentry/nestjs';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from '@/app/app.module';

import { LoggingInterceptor } from './app/common/interceptors/logging.interceptor';
import { RequestIdInterceptor } from './app/common/interceptors/request-id.interceptor';

import { EnvironmentVariables } from '@/validation/env.validation';

import { CLIENT_URL_REGEX, PREVIEW_CLIENT_URL_REGEX } from '@/utils/constants';

import { GlobalExceptionFilter } from './app/common/filters/http-exception.filter';
import { validationExceptionFactory } from './utils/validation';

import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('query parser', 'extended');

  // Enable gzip compression for all responses
  app.use(compression());

  const config: ConfigService<EnvironmentVariables, true> =
    app.get(ConfigService);

  app.setGlobalPrefix('v1');

  // Global exception filters - Sentry captures before our custom filter handles
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors - RequestIdInterceptor must be first for tracing
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new LoggingInterceptor(),
  );
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const trustedOrigins = config.get<string>('TRUSTED_ORIGINS').split(',');

  app.enableCors({
    origin: [
      ...trustedOrigins,
      'https://peerscholar.vercel.app',
      new RegExp(CLIENT_URL_REGEX),
      new RegExp(PREVIEW_CLIENT_URL_REGEX),
    ],
    credentials: true,
  });

  const port = config.get<number>('PORT');

  await app.listen(port);
}
void bootstrap();
