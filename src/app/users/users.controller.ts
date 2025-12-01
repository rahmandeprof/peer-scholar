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

import { CreateUserDto } from '@/app/users/dto/create-user.dto';
import { UpdateAcademicProfileDto } from '@/app/users/dto/update-academic-profile.dto';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post('onboarding')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onboarding(@Req() req: any, @Body() dto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
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
}
