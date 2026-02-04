import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/app/users/users.module';

import { Department } from '@/app/academic/entities/department.entity';
import { DocumentSegment } from '@/app/academic/entities/document-segment.entity';
import { Faculty } from '@/app/academic/entities/faculty.entity';
import { Material } from '@/app/academic/entities/material.entity';
import { MaterialReport } from '@/app/academic/entities/material-report.entity';
import { School } from '@/app/academic/entities/school.entity';
import { QuizResult } from '@/app/chat/entities/quiz-result.entity';
import { User } from '@/app/users/entities/user.entity';

import { AdminController } from '@/app/admin/admin.controller';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      Material,
      DocumentSegment,
      MaterialReport,
      User,
      QuizResult,
      School,
      Faculty,
      Department,
    ]),
    BullModule.registerQueue({ name: 'materials' }),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
