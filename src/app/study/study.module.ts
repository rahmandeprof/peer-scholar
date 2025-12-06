import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/app/users/users.module';

import { StudySession } from './entities/study-session.entity';
import { User } from '@/app/users/entities/user.entity';

import { StudyController } from './study.controller';

import { StudyService } from './study.service';

import { StudyProcessor } from './processors/study.processor';
import { StudyGateway } from './study.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([StudySession, User]), UsersModule],
  controllers: [StudyController],
  providers: [StudyService, StudyProcessor, StudyGateway],
  exports: [StudyService],
})
export class StudyModule {}
