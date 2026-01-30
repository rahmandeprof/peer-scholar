import { Controller, Get, Header, Param } from '@nestjs/common';

import { AcademicService } from './academic.service';

@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) { }

  @Get('schools')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=7200') // 1hr client, 2hr CDN
  getSchools() {
    return this.academicService.getSchools();
  }

  @Get('schools/:id/faculties')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=7200') // 1hr client, 2hr CDN
  getFaculties(@Param('id') id: string) {
    return this.academicService.getFaculties(id);
  }

  @Get('faculties/:id/departments')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=7200') // 1hr client, 2hr CDN
  getDepartments(@Param('id') id: string) {
    return this.academicService.getDepartments(id);
  }

  @Get('departments/:id/courses')
  @Header('Cache-Control', 'public, max-age=600, s-maxage=1800') // 10min client, 30min CDN
  getCourses(@Param('id') id: string) {
    return this.academicService.getCourses(id);
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.academicService.getCourse(id);
  }
}
