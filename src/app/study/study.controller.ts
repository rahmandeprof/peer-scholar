import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

import { StudySessionType } from './entities/study-session.entity';
import { User } from '@/app/users/entities/user.entity';

import {
  QualityRating,
  SpacedRepetitionService,
} from './services/spaced-repetition.service';
import { StudyService } from './study.service';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: User;
}

@Controller('study')
export class StudyController {
  constructor(
    private readonly studyService: StudyService,
    private readonly spacedRepetitionService: SpacedRepetitionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
  @Post('streak/restore')
  restoreStreak(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    return this.studyService.restoreStreak(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('streak/decline')
  declineStreak(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    return this.studyService.declineRestore(req.user.id);
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
  @Get('dashboard/init')
  getDashboardInit(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new Error('User not found');
    }

    return this.studyService.getDashboardInit(req.user.id);
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
    @Body()
    body: { materialId?: string; durationSeconds: number; timestamp: number },
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

  // ==================== Spaced Repetition Endpoints ====================

  /**
   * Get flashcards due for review
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('flashcards/:materialId/due')
  async getDueFlashcards(
    @Req() req: RequestWithUser,
    @Param('materialId') materialId: string,
    @Body() body: { totalCards: number },
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    // Note: totalCards should be passed from frontend based on material's flashcard count
    const totalCards = body?.totalCards || 20; // Default fallback

    return this.spacedRepetitionService.getDueCards(
      req.user.id,
      materialId,
      totalCards,
    );
  }

  /**
   * Get progress stats for flashcard study
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('flashcards/:materialId/stats')
  async getFlashcardStats(
    @Req() req: RequestWithUser,
    @Param('materialId') materialId: string,
    @Body() body: { totalCards: number },
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    const totalCards = body?.totalCards || 20;

    return this.spacedRepetitionService.getProgressStats(
      req.user.id,
      materialId,
      totalCards,
    );
  }

  /**
   * Record a review result for a flashcard
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('flashcards/:materialId/review')
  async recordFlashcardReview(
    @Req() req: RequestWithUser,
    @Param('materialId') materialId: string,
    @Body() body: { cardIndex: number; quality: QualityRating },
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    return this.spacedRepetitionService.recordReview(
      req.user.id,
      materialId,
      body.cardIndex,
      body.quality,
    );
  }

  /**
   * Reset all progress for a material
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('flashcards/:materialId/reset')
  async resetFlashcardProgress(
    @Req() req: RequestWithUser,
    @Param('materialId') materialId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    await this.spacedRepetitionService.resetMaterial(req.user.id, materialId);

    return { success: true };
  }
}
