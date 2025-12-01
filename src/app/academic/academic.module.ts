import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from './entities/course.entity';
import { Department } from './entities/department.entity';
import { Faculty } from './entities/faculty.entity';
import { Material } from './entities/material.entity';
import { School } from './entities/school.entity';

import { AcademicController } from './academic.controller';
import { MaterialsController } from './materials.controller';

import { AcademicService } from './academic.service';
import { MaterialsService } from './materials.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, Faculty, Department, Course, Material]),
    BullModule.registerQueue({
      name: 'materials',
    }),
  ],
  controllers: [AcademicController, MaterialsController],
  providers: [AcademicService, MaterialsService],
  exports: [TypeOrmModule, AcademicService, MaterialsService],
})
export class AcademicModule {}
