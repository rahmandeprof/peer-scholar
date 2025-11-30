import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { StudySessionType } from './entities/study-session.entity';
import { User } from '@/app/users/entities/user.entity';

import { StudyService } from './study.service';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: User;
}

@Controller('study')
@UseGuards(AuthGuard('jwt'))
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Post('start')
  startSession(
    @Req() req: RequestWithUser,
    @Body('type') type: StudySessionType,
  ) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.startSession(req.user.id, type);
  }

  @Post('end')
  endSession(
    @Req() req: RequestWithUser,
    @Body('sessionId') sessionId: string,
  ) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.endSession(req.user.id, sessionId);
  }

  @Get('streak')
  getStreak(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getStreak(req.user.id);
  }
}
