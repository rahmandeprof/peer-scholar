import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CreateMaterialDto } from './dto/create-material.dto';

import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(AuthGuard('jwt'))
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) { }

  @Get('presign')
  getPresignedUrl() {
    return this.materialsService.getPresignedUrl();
  }

  @Post()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(@Body() dto: CreateMaterialDto, @Req() req: any) {
    return this.materialsService.create(dto, req.user);
  }

  @Get()
  findAll(
    @Query('courseId') courseId: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.materialsService.findAll(courseId, type, search);
  }
}
