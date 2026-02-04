import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { UsersModule } from '@/app/users/users.module';
import { Material } from '@/app/academic/entities/material.entity';
import { DocumentSegment } from '@/app/academic/entities/document-segment.entity';
import { MaterialReport } from '@/app/academic/entities/material-report.entity';
import { User } from '@/app/users/entities/user.entity';
import { QuizResult } from '@/app/chat/entities/quiz-result.entity';
import { School } from '@/app/academic/entities/school.entity';
import { Faculty } from '@/app/academic/entities/faculty.entity';
import { Department } from '@/app/academic/entities/department.entity';

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
export class AdminModule { }

