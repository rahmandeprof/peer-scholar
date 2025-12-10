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
  constructor(private readonly studyService: StudyService) { }

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

  @Get('stats/weekly')
  getWeeklyStats(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getWeeklyStats(req.user.id);
  }

  @Post('reading/start')
  startReading(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.startOrContinueReadingSession(req.user.id);
  }

  @Post('reading/heartbeat')
  readingHeartbeat(
    @Req() req: RequestWithUser,
    @Body('sessionId') sessionId: string,
    @Body('seconds') seconds: number,
  ) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.readingHeartbeat(req.user.id, sessionId, seconds);
  }

  @Get('activity/history')
  getActivityHistory(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getActivityHistory(req.user.id, 30);
  }
}
