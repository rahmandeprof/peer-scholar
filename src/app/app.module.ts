import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AcademicModule } from '@/app/academic/academic.module';
import { AdminModule } from '@/app/admin/admin.module';
import { AuthModule } from '@/app/auth/auth.module';
import { CacheModule } from '@/app/cache/cache.module';
import { ChatModule } from '@/app/chat/chat.module';
import { CommonModule } from '@/app/common/common.module';
import { DocumentProcessingModule } from '@/app/document-processing/document-processing.module';
import { FeedbackModule } from '@/app/feedback/feedback.module';
import { OtpModule } from '@/app/otp/otp.module';
import { QueueModule } from '@/app/queue/queue.module';
import { QuizEngineModule } from '@/app/quiz-engine/quiz-engine.module';
import { StudyModule } from '@/app/study/study.module';
import { TTSModule } from '@/app/tts/tts.module';
import { UsersModule } from '@/app/users/users.module';
import { DatabaseModule } from '@/database/database.module';
import { MailModule } from '@/mail/mail.module';

import { ErrorsInterceptor } from '@/interceptor/error.interceptor';
import { RequestLoggingInterceptor } from '@/interceptor/request-logging.interceptor';

import { validate } from '@/validation/env.validation';

import { AppController } from '@/app/app.controller';

import { AppService } from '@/app/app.service';
import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';

import configuration from '@/config/configuration';

import { SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    SentryModule.forRoot(), // Must be first for proper error capturing
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [() => configuration],
      validate,
    }),
    DatabaseModule,
    QueueModule, // Initialize Bull/Redis first
    CacheModule, // Global cache service
    AuthModule,
    UsersModule,
    OtpModule,
    MailModule,
    AdminModule,
    StudyModule,
    ChatModule,
    CommonModule,
    AcademicModule,
    QuizEngineModule,
    FeedbackModule,
    TTSModule,
    DocumentProcessingModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'global',
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
        {
          name: 'quiz',
          ttl: 86400000, // 24 hours
          limit: 10,
        },
        {
          name: 'upload',
          ttl: 3600000, // 1 hour
          limit: 5,
        },
      ],
      storage: new ThrottlerStorageRedisService({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    WinstonLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorsInterceptor,
    },
  ],
})
export class AppModule {}
