import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from './entities/course.entity';
import { Department } from './entities/department.entity';
import { Faculty } from './entities/faculty.entity';
import { School } from './entities/school.entity';

@Module({
  imports: [TypeOrmModule.forFeature([School, Faculty, Department, Course])],
  exports: [TypeOrmModule],
})
export class AcademicModule {}
