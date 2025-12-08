import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/app/users/users.module';

import { Course } from './entities/course.entity';
import { Department } from './entities/department.entity';
import { Faculty } from './entities/faculty.entity';
import { Material } from './entities/material.entity';
import { MaterialAnnotation } from './entities/material-annotation.entity';
import { MaterialChunk } from './entities/material-chunk.entity';
import { MaterialFavorite } from './entities/material-favorite.entity';
import { MaterialRating } from './entities/material-rating.entity';
import { MaterialReport } from './entities/material-report.entity';
import { Note } from './entities/note.entity';
import { PersonalCourse } from './entities/personal-course.entity';
import { School } from './entities/school.entity';

import { AcademicController } from './academic.controller';
import { MaterialsController } from './materials.controller';
import { PersonalCoursesController } from './personal-courses.controller';

import { AcademicService } from './academic.service';
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
    ]),
    BullModule.registerQueue({
      name: 'materials',
    }),
    UsersModule,
  ],
  controllers: [
    AcademicController,
    MaterialsController,
    PersonalCoursesController,
  ],
  providers: [
    AcademicService,
    MaterialsService,
    MaterialProcessor,
    PersonalCoursesService,
  ],
  exports: [
    TypeOrmModule,
    AcademicService,
    MaterialsService,
    PersonalCoursesService,
  ],
})
export class AcademicModule {}
