import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Course } from './entities/course.entity';
import { Department } from './entities/department.entity';
import { Faculty } from './entities/faculty.entity';
import { School } from './entities/school.entity';

import { Repository } from 'typeorm';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(School)
    private schoolRepo: Repository<School>,
    @InjectRepository(Faculty)
    private facultyRepo: Repository<Faculty>,
    @InjectRepository(Department)
    private departmentRepo: Repository<Department>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
  ) {}

  getSchools() {
    return this.schoolRepo.find();
  }

  getFaculties(schoolId: string) {
    return this.facultyRepo.find({ where: { school: { id: schoolId } } });
  }

  getDepartments(facultyId: string) {
    return this.departmentRepo.find({ where: { faculty: { id: facultyId } } });
  }

  getCourses(departmentId: string) {
    return this.courseRepo.find({
      where: { department: { id: departmentId } },
      order: { level: 'ASC', code: 'ASC' },
    });
  }

  getCourse(id: string) {
    return this.courseRepo.findOneBy({ id });
  }
}
