import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { RateLimitGuard } from '@/app/auth/guards/rate-limit.guard';

import { CreateMaterialDto } from './dto/create-material.dto';

import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(AuthGuard('jwt'))
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get('presign')
  getPresignedUrl() {
    return this.materialsService.getPresignedUrl();
  }

  @Post()
  @UseGuards(RateLimitGuard)
  @Throttle({ upload: { limit: 5, ttl: 3600000 } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(@Body() dto: CreateMaterialDto, @Req() req: any) {
    if (!req.user.isVerified) {
      throw new ForbiddenException(
        'You must verify your email to upload materials.',
      );
    }

    return this.materialsService.create(dto, req.user);
  }

  @Get()
  findAll(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    @Query('courseId') courseId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.materialsService.findAll(req.user, courseId, type, search);
  }

  @Patch(':id/scope')
  updateScope(
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Body('scope') scope: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.updateScope(id, scope, req.user.id);
  }

  @Get('trending')
  getTrending() {
    return this.materialsService.getTrending();
  }

  @Get('course/:courseId/topics')
  getCourseTopics(@Param('courseId') courseId: string) {
    return this.materialsService.getCourseTopics(courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @Post(':id/extract-text')
  extractText(@Param('id') id: string) {
    return this.materialsService.extractText(id);
  }

  @Post('check-duplicate')
  checkDuplicate(
    @Body('hash') hash: string,
    @Body('department') department?: string,
  ) {
    return this.materialsService.checkDuplicate(hash, department);
  }

  @Post(':id/favorite')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toggleFavorite(@Param('id') id: string, @Req() req: any) {
    return this.materialsService.toggleFavorite(id, req.user.id);
  }

  @Post(':id/rate')
  rateMaterial(
    @Param('id') id: string,
    @Body('value') value: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.rateMaterial(id, req.user.id, value);
  }

  @Get(':id/interactions')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInteractionStatus(@Param('id') id: string, @Req() req: any) {
    return this.materialsService.getInteractionStatus(id, req.user.id);
  }

  @Post(':id/contributor')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addContributor(@Param('id') id: string, @Req() req: any) {
    return this.materialsService.addContributor(id, req.user.id);
  }

  @Post(':id/annotations')
  addAnnotation(
    @Param('id') id: string,
    @Body()
    body: {
      selectedText: string;
      pageNumber?: number;
      year: string;
      session: string;
      contextBefore?: string;
      contextAfter?: string;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.addAnnotation(id, req.user.id, body);
  }

  @Get(':id/annotations')
  getAnnotations(@Param('id') id: string) {
    return this.materialsService.getAnnotations(id);
  }
  @Post(':id/report')
  async reportMaterial(
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    @Body() body: { reason: string; description?: string },
  ) {
    return this.materialsService.reportMaterial(
      id,
      req.user.id,
      body.reason,
      body.description,
    );
  }

  @Post(':id/note')
  saveNote(
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    @Body('content') content: string,
  ) {
    return this.materialsService.saveNote(req.user.id, id, content);
  }

  @Get(':id/note')
  getNote(
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.getNote(req.user.id, id);
  }
}
