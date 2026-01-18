import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Department } from '@/app/academic/entities/department.entity';
import { Faculty } from '@/app/academic/entities/faculty.entity';
import { PartnerRequest } from '@/app/users/entities/partner-request.entity';
import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';
import { UserBadge } from '@/app/users/entities/user-badge.entity';
import { ReadingProgress } from '@/app/users/entities/reading-progress.entity';
import { ViewingHistory } from '@/app/users/entities/viewing-history.entity';

import { UsersController } from '@/app/users/users.controller';
import { BadgeController } from '@/app/users/badge.controller';

import { UsersService } from '@/app/users/users.service';
import { BadgeService } from '@/app/users/badge.service';
import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';
import { NotificationsModule } from '@/app/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      StudyStreak,
      PartnerRequest,
      Department,
      Faculty,
      UserBadge,
      ReadingProgress,
      ViewingHistory,
    ]),
    NotificationsModule,
  ],
  controllers: [UsersController, BadgeController],
  providers: [UsersService, BadgeService, WinstonLoggerService],
  exports: [UsersService, BadgeService],
})
export class UsersModule { }

