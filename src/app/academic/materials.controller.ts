import {
  Body,
  Controller,
  Delete,
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
import { RolesGuard } from '@/app/common/guards/roles.guard';
import { Roles } from '@/app/common/decorators/roles.decorator';

import { CreateMaterialDto } from './dto/create-material.dto';
import { FlagMaterialDto } from './dto/flag-material.dto';

import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(AuthGuard('jwt'))
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) { }

  /**
   * Get processing status for multiple materials at once
   * Used for polling to detect when processing completes
   */
  @Get('batch-status')
  getBatchStatus(@Query('ids') ids: string) {
    const materialIds = ids ? ids.split(',').filter(id => id.trim()) : [];
    return this.materialsService.getBatchStatus(materialIds);
  }

  @Get('presign')
  getPresignedUrl(
    @Query('fileType') fileType?: string,
    @Query('filename') filename?: string,
  ) {
    return this.materialsService.getPresignedUrl(fileType || 'application/octet-stream', filename);
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

  @Get('favorites/count')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFavoritesCount(@Req() req: any) {
    return this.materialsService.getFavoritesCount(req.user.id);
  }

  @Get('favorites')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFavorites(@Req() req: any) {
    return this.materialsService.getFavorites(req.user.id);
  }

  @Get()
  findAll(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    @Query('courseId') courseId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 12;
    return this.materialsService.findAll(
      req.user,
      courseId,
      type,
      search,
      pageNum,
      limitNum,
    );
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTrending(@Req() req: any) {
    return this.materialsService.getTrending(req.user);
  }

  @Get('course/:courseId/topics')
  getCourseTopics(@Param('courseId') courseId: string) {
    return this.materialsService.getCourseTopics(courseId);
  }

  @Get(':id/full')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findOneFull(@Param('id') id: string, @Req() req: any) {
    return this.materialsService.findOneFull(id, req.user.id);
  }

  @Get(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.materialsService.findOne(id, req.user?.id);
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

  // Public Notes Endpoints
  @Get(':id/public-notes')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPublicNotes(@Param('id') id: string, @Req() req: any) {
    return this.materialsService.getPublicNotes(id, req.user?.id);
  }

  @Post(':id/public-notes')
  createPublicNote(
    @Param('id') id: string,
    @Body()
    body: {
      selectedText: string;
      note: string;
      pageNumber?: number;
      contextBefore?: string;
      contextAfter?: string;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.createPublicNote(id, req.user.id, body);
  }

  @Post(':id/public-notes/:noteId/delete')
  deletePublicNote(
    @Param('noteId') noteId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.deletePublicNote(noteId, req.user.id);
  }

  @Post(':id/public-notes/:noteId/vote')
  votePublicNote(
    @Param('noteId') noteId: string,
    @Body('value') value: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.votePublicNote(noteId, req.user.id, value);
  }

  // ===== FLAGGING ENDPOINTS =====

  @Post(':id/flag')
  flagMaterial(
    @Param('id') id: string,
    @Body() dto: FlagMaterialDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ) {
    return this.materialsService.flagMaterial(
      id,
      req.user.id,
      dto.reason,
      dto.description,
    );
  }

  // ===== ADMIN ENDPOINTS =====

  @Get('admin/flagged')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getFlaggedMaterials() {
    return this.materialsService.getFlaggedMaterials();
  }

  @Get('admin/:id/flags')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getMaterialFlags(@Param('id') id: string) {
    return this.materialsService.getMaterialFlags(id);
  }

  @Post('admin/:id/dismiss-flags')
  @UseGuards(RolesGuard)
  @Roles('admin')
  dismissFlags(@Param('id') id: string) {
    return this.materialsService.dismissFlags(id);
  }

  @Delete('admin/:id/force')
  @UseGuards(RolesGuard)
  @Roles('admin')
  forceDeleteMaterial(@Param('id') id: string) {
    return this.materialsService.forceDeleteMaterial(id);
  }

  // ==================== Page Bookmarks ====================

  @Post(':id/bookmarks')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBookmark(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { pageNumber: number; note?: string },
  ) {
    return this.materialsService.createBookmark(
      req.user.id,
      id,
      body.pageNumber,
      body.note,
    );
  }

  @Get(':id/bookmarks')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBookmarks(@Param('id') id: string, @Req() req: any) {
    return this.materialsService.getBookmarks(req.user.id, id);
  }

  @Delete(':id/bookmarks/:bookmarkId')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteBookmark(
    @Param('id') id: string,
    @Param('bookmarkId') bookmarkId: string,
    @Req() req: any,
  ) {
    return this.materialsService.deleteBookmark(req.user.id, bookmarkId);
  }
}
