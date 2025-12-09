import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatModule } from '@/app/chat/chat.module';
import { UsersModule } from '@/app/users/users.module';

import { StudySession } from './entities/study-session.entity';
import { User } from '@/app/users/entities/user.entity';

import { StudyController } from './study.controller';

import { StudyService } from './study.service';

import { StudyProcessor } from './processors/study.processor';
import { StudyGateway } from './study.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudySession, User]),
    UsersModule,
    ChatModule,
  ],
  controllers: [StudyController],
  providers: [StudyService, StudyProcessor, StudyGateway],
  exports: [StudyService],
})
export class StudyModule {}
