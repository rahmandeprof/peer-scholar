import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PersonalCoursesService } from './personal-courses.service';

@Controller('academic/collections')
@UseGuards(AuthGuard('jwt'))
export class PersonalCoursesController {
  constructor(
    private readonly personalCoursesService: PersonalCoursesService,
  ) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Body() body: { title: string; code?: string; color?: string },
  ) {
    return this.personalCoursesService.create(req.user.id, body);
  }

  @Get()
  findAll(@Req() req: { user: { id: string } }) {
    return this.personalCoursesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.personalCoursesService.findOne(req.user.id, id);
  }

  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.personalCoursesService.remove(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { title?: string; color?: string },
  ) {
    return this.personalCoursesService.update(req.user.id, id, body);
  }

  @Post(':id/materials')
  addMaterial(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body('materialId') materialId: string,
  ) {
    return this.personalCoursesService.addMaterial(req.user.id, id, materialId);
  }

  @Delete(':id/materials/:materialId')
  removeMaterial(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Param('materialId') materialId: string,
  ) {
    return this.personalCoursesService.removeMaterial(
      req.user.id,
      id,
      materialId,
    );
  }
}
