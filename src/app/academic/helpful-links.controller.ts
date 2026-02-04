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

import {
  CreateHelpfulLinkDto,
  UpdateHelpfulLinkDto,
} from './dtos/helpful-link.dto';

import { HelpfulLinksService } from './helpful-links.service';

@Controller('helpful-links')
export class HelpfulLinksController {
  constructor(private readonly helpfulLinksService: HelpfulLinksService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateHelpfulLinkDto, @Req() req: any) {
    return this.helpfulLinksService.create(dto, req.user.id);
  }

  @Get('material/:materialId')
  findByMaterial(@Param('materialId') materialId: string) {
    return this.helpfulLinksService.findByMaterial(materialId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.helpfulLinksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHelpfulLinkDto,
    @Req() req: any,
  ) {
    return this.helpfulLinksService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string, @Req() req: any) {
    return this.helpfulLinksService.remove(id, req.user.id);
  }

  @Post(':id/helpful')
  @UseGuards(AuthGuard('jwt'))
  markHelpful(@Param('id') id: string) {
    return this.helpfulLinksService.markHelpful(id);
  }
}
