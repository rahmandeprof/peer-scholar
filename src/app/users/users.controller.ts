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
import { AuthenticatedRequest } from '@/app/common/types/request.types';

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

  getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('profile')

  updateProfile(@Req() req: AuthenticatedRequest, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Get('timer-settings')

  getTimerSettings(@Req() req: AuthenticatedRequest) {
    return this.usersService.getTimerSettings(req.user.id);
  }

  @Patch('timer-settings')

  updateTimerSettings(@Req() req: AuthenticatedRequest, @Body() dto: UpdateTimerSettingsDto) {
    return this.usersService.updateTimerSettings(req.user.id, dto);
  }

  @Patch('academic-profile')
  updateAcademicProfile(

    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAcademicProfileDto,
  ) {
    return this.usersService.updateAcademicProfile(req.user.id, dto);
  }

  @Post('partner/invite')

  invitePartner(@Body('email') email: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.invitePartner(req.user.id, email);
  }

  @Post('partner/accept/:id')

  acceptPartner(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.respondToRequest(id, req.user.id, true);
  }

  @Post('partner/reject/:id')

  rejectPartner(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.respondToRequest(id, req.user.id, false);
  }

  @Post('partner/nudge/:id')

  nudgePartner(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.nudgePartner(req.user.id, id);
  }

  @Get('partner')

  getPartnerStats(@Req() req: AuthenticatedRequest) {
    return this.usersService.getPartnerStats(req.user.id);
  }

  @Get('partner/requests')

  getPendingRequests(@Req() req: AuthenticatedRequest) {
    return this.usersService.getPendingRequests(req.user.id);
  }

  @Get('partner/sent')

  getSentRequests(@Req() req: AuthenticatedRequest) {
    return this.usersService.getSentRequests(req.user.id);
  }

  @Delete('partner/invite/:id')

  cancelInvite(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.cancelInvite(id, req.user.id);
  }

  // ===== Viewing History (cross-device sync) =====

  @Get('viewing-history')

  getViewingHistory(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.usersService.getViewingHistory(req.user.id, parsedLimit);
  }

  @Post('viewing-history')

  recordView(
    @Req() req: AuthenticatedRequest,
    @Body() body: { materialId: string; lastPage?: number },
  ) {
    return this.usersService.recordView(req.user.id, body.materialId, body.lastPage || 1);
  }

  @Delete('viewing-history/:materialId')

  removeFromHistory(@Param('materialId') materialId: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.removeFromViewingHistory(req.user.id, materialId);
  }

  // ===== User Preferences (cross-device sync) =====

  @Get('preferences')

  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.usersService.getPreferences(req.user.id);
  }

  @Patch('preferences')

  updatePreferences(@Req() req: AuthenticatedRequest, @Body() updates: Record<string, any>) {
    return this.usersService.updatePreferences(req.user.id, updates);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')

  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw new ForbiddenException('Cannot update other users');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Post('onboarding')

  onboarding(@Req() req: AuthenticatedRequest, @Body() dto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(req.user.id, dto);
  }

  @Delete(':id')

  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw new ForbiddenException('Cannot delete other users');
    }
    return this.usersService.remove(id);
  }

  @Get('activity/recent')

  getActivity(@Req() req: AuthenticatedRequest, @Query('materialId') materialId?: string) {
    return this.usersService.getActivity(req.user.id, materialId);
  }

  @Post('activity/update')
  updateActivity(

    @Req() req: AuthenticatedRequest,
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

  async getLeaderboards(@Req() req: AuthenticatedRequest) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.usersService.getLeaderboards();
  }
}
