import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { UsersModule } from '@/app/users/users.module';
import { Material } from '@/app/academic/entities/material.entity';
import { DocumentSegment } from '@/app/academic/entities/document-segment.entity';
import { User } from '@/app/users/entities/user.entity';
import { QuizResult } from '@/app/chat/entities/quiz-result.entity';

import { AdminController } from '@/app/admin/admin.controller';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Material, DocumentSegment, User, QuizResult]),
    BullModule.registerQueue({ name: 'materials' }),
  ],
  controllers: [AdminController],
})
export class AdminModule { }
