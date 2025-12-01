import { Controller, Get, Param } from '@nestjs/common';

import { AcademicService } from './academic.service';

@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) { }

  @Get('schools')
  getSchools() {
    return this.academicService.getSchools();
  }

  @Get('schools/:id/faculties')
  getFaculties(@Param('id') id: string) {
    return this.academicService.getFaculties(id);
  }

  @Get('faculties/:id/departments')
  getDepartments(@Param('id') id: string) {
    return this.academicService.getDepartments(id);
  }

  @Get('departments/:id/courses')
  getCourses(@Param('id') id: string) {
    return this.academicService.getCourses(id);
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.academicService.getCourse(id);
  }
}
