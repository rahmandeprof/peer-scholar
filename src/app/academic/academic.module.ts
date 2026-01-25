import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentProcessingModule } from '@/app/document-processing/document-processing.module';
import { QuizEngineModule } from '@/app/quiz-engine/quiz-engine.module';
import { UsersModule } from '@/app/users/users.module';

import { ViewingHistory } from '../users/entities/viewing-history.entity';
import { Course } from './entities/course.entity';
import { Department } from './entities/department.entity';
import { DocumentSegment } from './entities/document-segment.entity';
import { Faculty } from './entities/faculty.entity';
import { HelpfulLink } from './entities/helpful-link.entity';
import { Material } from './entities/material.entity';
import { MaterialAnnotation } from './entities/material-annotation.entity';
import { MaterialChunk } from './entities/material-chunk.entity';
import { MaterialFavorite } from './entities/material-favorite.entity';
import { MaterialFlag } from './entities/material-flag.entity';
import { MaterialRating } from './entities/material-rating.entity';
import { MaterialReport } from './entities/material-report.entity';
import { Note } from './entities/note.entity';
import { PageBookmark } from './entities/page-bookmark.entity';
import { PersonalCourse } from './entities/personal-course.entity';
import { PublicNote, PublicNoteVote } from './entities/public-note.entity';
import { School } from './entities/school.entity';

import { AcademicController } from './academic.controller';
import { HelpfulLinksController } from './helpful-links.controller';
import { MaterialsController } from './materials.controller';
import { PersonalCoursesController } from './personal-courses.controller';

import { AcademicService } from './academic.service';
import { HelpfulLinksService } from './helpful-links.service';
import { MaterialsService } from './materials.service';
import { PersonalCoursesService } from './personal-courses.service';

import { MaterialProcessor } from './processors/material.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      School,
      Faculty,
      Department,
      Course,
      Material,
      MaterialChunk,
      MaterialRating,
      MaterialFavorite,
      MaterialAnnotation,
      MaterialAnnotation,
      MaterialReport,
      Note,
      PersonalCourse,
      PublicNote,
      PublicNoteVote,
      HelpfulLink,
      MaterialFlag,
      DocumentSegment,
      PageBookmark,
      ViewingHistory, // For recommendations
    ]),
    BullModule.registerQueue({
      name: 'materials',
      defaultJobOptions: {
        timeout: 1200000, // 20 minutes max processing time
        attempts: 2, // Retry once on failure
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs for debugging
      },
    }),
    UsersModule,
    DocumentProcessingModule,
    QuizEngineModule,
  ],
  controllers: [
    AcademicController,
    MaterialsController,
    PersonalCoursesController,
    HelpfulLinksController,
  ],
  providers: [
    AcademicService,
    MaterialsService,
    MaterialProcessor,
    PersonalCoursesService,
    HelpfulLinksService,
  ],
  exports: [
    TypeOrmModule,
    AcademicService,
    MaterialsService,
    PersonalCoursesService,
  ],
})
export class AcademicModule {}
