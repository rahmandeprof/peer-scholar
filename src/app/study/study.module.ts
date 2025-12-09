import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatModule } from '@/app/chat/chat.module';
import { UsersModule } from '@/app/users/users.module';

import { StudySession } from './entities/study-session.entity';
import { User } from '@/app/users/entities/user.entity';

import { StudyController } from './study.controller';

import { StudyService } from './study.service';
import { ChallengeCacheService } from './challenge-cache.service';

import { StudyProcessor } from './processors/study.processor';
import { StudyGateway } from './study.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudySession, User]),
    UsersModule,
    ChatModule,
    JwtModule.register({}), // Uses ConfigService for secret at runtime
  ],
  controllers: [StudyController],
  providers: [StudyService, StudyProcessor, StudyGateway, ChallengeCacheService],
  exports: [StudyService],
})
export class StudyModule { }

