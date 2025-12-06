import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

import { AcademicModule } from '@/app/academic/academic.module';
import { AdminModule } from '@/app/admin/admin.module';
import { AuthModule } from '@/app/auth/auth.module';
import { ChatModule } from '@/app/chat/chat.module';
import { CommonModule } from '@/app/common/common.module';
import { OtpModule } from '@/app/otp/otp.module';
import { QueueModule } from '@/app/queue/queue.module';
import { StudyModule } from '@/app/study/study.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [() => configuration],
      validate,
    }),
    DatabaseModule,
    QueueModule, // Initialize Bull/Redis first
    AuthModule,
    UsersModule,
    OtpModule,
    MailModule,
    AdminModule,
    StudyModule,
    ChatModule,
    CommonModule,
    AcademicModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
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
export class AppModule { }
