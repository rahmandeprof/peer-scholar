import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/app/users/users.module';

import { StudySession } from './entities/study-session.entity';

import { StudyController } from './study.controller';

import { StudyService } from './study.service';

import { StudyProcessor } from './processors/study.processor';

@Module({
  imports: [TypeOrmModule.forFeature([StudySession]), UsersModule],
  controllers: [StudyController],
  providers: [StudyService, StudyProcessor],
  exports: [StudyService],
})
export class StudyModule {}
