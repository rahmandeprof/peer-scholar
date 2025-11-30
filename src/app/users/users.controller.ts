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
import { UpdateUserDto } from '@/app/users/dto/update-user.dto';

import { UsersService } from '@/app/users/users.service';

import { Paginate, PaginateQuery } from 'nestjs-paginate';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  public findAll(@Paginate() query: PaginateQuery) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post('partner/invite')
  invitePartner(@Body('email') email: string, @Req() req: any) {
    return this.usersService.invitePartner(req.user.id, email);
  }

  @Post('partner/accept/:id')
  acceptPartner(@Param('id') id: string, @Req() req: any) {
    return this.usersService.respondToRequest(id, req.user.id, true);
  }

  @Post('partner/reject/:id')
  rejectPartner(@Param('id') id: string, @Req() req: any) {
    return this.usersService.respondToRequest(id, req.user.id, false);
  }

  @Get('partner')
  getPartnerStats(@Req() req: any) {
    return this.usersService.getPartnerStats(req.user.id);
  }

  @Get('partner/requests')
  getPendingRequests(@Req() req: any) {
    return this.usersService.getPendingRequests(req.user.id);
  }
}
