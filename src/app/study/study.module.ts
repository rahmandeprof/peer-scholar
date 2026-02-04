import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatModule } from '@/app/chat/chat.module';
import { NotificationsModule } from '@/app/notifications/notifications.module';
import { UsersModule } from '@/app/users/users.module';

import { FlashcardProgress } from './entities/flashcard-progress.entity';
import { StudySession } from './entities/study-session.entity';
import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';

import { StudyController } from './study.controller';

import { ChallengeCacheService } from './challenge-cache.service';
import { SpacedRepetitionService } from './services/spaced-repetition.service';
import { StudyService } from './study.service';

import { StudyProcessor } from './processors/study.processor';
import { StudyGateway } from './study.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudySession,
      FlashcardProgress,
      User,
      StudyStreak,
    ]),
    UsersModule,
    ChatModule,
    JwtModule.register({}), // Uses ConfigService for secret at runtime
    NotificationsModule,
  ],
  controllers: [StudyController],
  providers: [
    StudyService,
    SpacedRepetitionService,
    StudyProcessor,
    StudyGateway,
    ChallengeCacheService,
  ],
  exports: [StudyService, SpacedRepetitionService],
})
export class StudyModule {}
