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

import { CreateUserDto } from '@/app/users/dto/create-user.dto';
import { UpdateAcademicProfileDto } from '@/app/users/dto/update-academic-profile.dto';
import { UpdateTimerSettingsDto } from '@/app/users/dto/update-timer-settings.dto';
import { UpdateUserDto } from '@/app/users/dto/update-user.dto';

import { UsersService } from '@/app/users/users.service';

import { Paginate, PaginateQuery } from 'nestjs-paginate';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  public findAll(@Paginate() query: PaginateQuery) {
    return this.usersService.findAll(query);
  }

  @Get('profile')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProfile(@Req() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('profile')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Get('timer-settings')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTimerSettings(@Req() req: any) {
    return this.usersService.getTimerSettings(req.user.id);
  }

  @Patch('timer-settings')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTimerSettings(@Req() req: any, @Body() dto: UpdateTimerSettingsDto) {
    return this.usersService.updateTimerSettings(req.user.id, dto);
  }

  @Patch('academic-profile')
  updateAcademicProfile(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    @Body() dto: UpdateAcademicProfileDto,
  ) {
    return this.usersService.updateAcademicProfile(req.user.id, dto);
  }

  @Post('partner/invite')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invitePartner(@Body('email') email: string, @Req() req: any) {
    return this.usersService.invitePartner(req.user.id, email);
  }

  @Post('partner/accept/:id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  acceptPartner(@Param('id') id: string, @Req() req: any) {
    return this.usersService.respondToRequest(id, req.user.id, true);
  }

  @Post('partner/reject/:id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectPartner(@Param('id') id: string, @Req() req: any) {
    return this.usersService.respondToRequest(id, req.user.id, false);
  }

  @Post('partner/nudge/:id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nudgePartner(@Param('id') id: string, @Req() req: any) {
    return this.usersService.nudgePartner(req.user.id, id);
  }

  @Get('partner')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPartnerStats(@Req() req: any) {
    return this.usersService.getPartnerStats(req.user.id);
  }

  @Get('partner/requests')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPendingRequests(@Req() req: any) {
    return this.usersService.getPendingRequests(req.user.id);
  }

  @Get('partner/sent')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSentRequests(@Req() req: any) {
    return this.usersService.getSentRequests(req.user.id);
  }

  @Delete('partner/invite/:id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cancelInvite(@Param('id') id: string, @Req() req: any) {
    return this.usersService.cancelInvite(id, req.user.id);
  }

  // ===== Viewing History (cross-device sync) =====

  @Get('viewing-history')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getViewingHistory(@Req() req: any, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.usersService.getViewingHistory(req.user.id, parsedLimit);
  }

  @Post('viewing-history')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recordView(
    @Req() req: any,
    @Body() body: { materialId: string; lastPage?: number },
  ) {
    return this.usersService.recordView(req.user.id, body.materialId, body.lastPage || 1);
  }

  @Delete('viewing-history/:materialId')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeFromHistory(@Param('materialId') materialId: string, @Req() req: any) {
    return this.usersService.removeFromViewingHistory(req.user.id, materialId);
  }

  // ===== User Preferences (cross-device sync) =====

  @Get('preferences')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPreferences(@Req() req: any) {
    return this.usersService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatePreferences(@Req() req: any, @Body() updates: Record<string, any>) {
    return this.usersService.updatePreferences(req.user.id, updates);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw new ForbiddenException('Cannot update other users');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Post('onboarding')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onboarding(@Req() req: any, @Body() dto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(req.user.id, dto);
  }

  @Delete(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remove(@Param('id') id: string, @Req() req: any) {
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw new ForbiddenException('Cannot delete other users');
    }
    return this.usersService.remove(id);
  }

  @Get('activity/recent')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getActivity(@Req() req: any, @Query('materialId') materialId?: string) {
    return this.usersService.getActivity(req.user.id, materialId);
  }

  @Post('activity/update')
  updateActivity(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    @Body() body: { materialId: string; page: number },
  ) {
    return this.usersService.updateActivity(
      req.user.id,
      body.materialId,
      body.page,
    );
  }

  // ===== ADMIN ENDPOINTS =====

  @Get('admin/leaderboards')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getLeaderboards(@Req() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.usersService.getLeaderboards();
  }
}
