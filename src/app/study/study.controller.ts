import { Body, Controller, Get, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { StudySessionType } from './entities/study-session.entity';
import { User } from '@/app/users/entities/user.entity';

import { StudyService } from './study.service';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: User;
}

@Controller('study')
export class StudyController {
  constructor(
    private readonly studyService: StudyService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  // Beacon endpoint - no auth guard, validates token from body
  // This is called by sendBeacon on page unload
  @Post('reading/end')
  async endReading(
    @Req() req: RequestWithUser,
    @Body('sessionId') sessionId: string,
    @Body('seconds') seconds: number,
    @Body('_token') bodyToken?: string,
  ) {
    let userId: string;

    // Check if user is already authenticated (normal request with auth header)
    if (req.user) {
      userId = req.user.id;
    } else if (bodyToken) {
      // Validate token from body (sendBeacon request)
      try {
        const payload = this.jwtService.verify(bodyToken, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        userId = payload.sub;
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    } else {
      throw new UnauthorizedException('Authentication required');
    }

    return this.studyService.endReadingSession(userId, sessionId, seconds);
  }

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
  @Get('streak')
  getStreak(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getStreak(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('stats/weekly')
  getWeeklyStats(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getWeeklyStats(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('reading/start')
  startReading(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.startOrContinueReadingSession(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
  @Get('activity/history')
  getActivityHistory(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getActivityHistory(req.user.id, 30);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('leaderboard')
  getLeaderboard(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getWeeklyLeaderboard(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('reading/offline-sync')
  syncOfflineReading(
    @Req() req: RequestWithUser,
    @Body() body: { materialId?: string; durationSeconds: number; timestamp: number },
  ) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.syncOfflineReadingSession(
      req.user.id,
      body.durationSeconds,
      body.timestamp,
      body.materialId,
    );
  }
}
