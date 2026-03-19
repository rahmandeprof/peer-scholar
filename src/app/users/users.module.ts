import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheModule } from '@/app/cache/cache.module';
import { NotificationsModule } from '@/app/notifications/notifications.module';

import { Department } from '@/app/academic/entities/department.entity';
import { Faculty } from '@/app/academic/entities/faculty.entity';
import { Contest } from '@/app/users/entities/contest.entity';
import { PartnerRequest } from '@/app/users/entities/partner-request.entity';
import { ReadingProgress } from '@/app/users/entities/reading-progress.entity';
import { Referral } from '@/app/users/entities/referral.entity';
import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';
import { UserBadge } from '@/app/users/entities/user-badge.entity';
import { ViewingHistory } from '@/app/users/entities/viewing-history.entity';

import { BadgeController } from '@/app/users/badge.controller';
import { ContestsController } from '@/app/users/contests.controller';
import { UsersController } from '@/app/users/users.controller';

import { BadgeService } from '@/app/users/badge.service';
import { ContestsService } from '@/app/users/contests.service';
import { UsersService } from '@/app/users/users.service';
import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';

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
      Referral,
      Contest,
    ]),
    NotificationsModule,
    CacheModule,
  ],
  controllers: [UsersController, BadgeController, ContestsController],
  providers: [
    UsersService,
    BadgeService,
    ContestsService,
    WinstonLoggerService,
  ],
  exports: [UsersService, BadgeService, ContestsService],
})
export class UsersModule {}
