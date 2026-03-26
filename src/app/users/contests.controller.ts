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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { RolesGuard } from '@/app/auth/guards/roles.guard';

import { ContestsService } from './contests.service';

import { Role } from '@/app/auth/decorators';

import { Request } from 'express';

@ApiTags('Contests')
@ApiBearerAuth()
@Controller('contests')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @ApiOperation({ summary: 'Admin: Create a new referral contest' })
  @Role('admin')
  @Post()
  async createContest(
    @Body()
    body: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      isActive?: boolean;
      prizeConfig?: Record<string, string>;
      rules?: string;
    },
  ) {
    return this.contestsService.createContest({
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @ApiOperation({ summary: 'Admin: Get all referral contests' })
  @Role('admin')
  @Get('admin/all')
  async getAllContests() {
    return this.contestsService.getAllContests();
  }

  @ApiOperation({ summary: 'Admin: Update a referral contest' })
  @Role('admin')
  @Patch('admin/:id')
  async updateContest(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
      prizeConfig?: Record<string, string>;
      rules?: string;
    },
  ) {
    return this.contestsService.updateContest(id, {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  @ApiOperation({ summary: 'Admin: Delete a referral contest' })
  @Role('admin')
  @Delete('admin/:id')
  async deleteContest(@Param('id') id: string) {
    return this.contestsService.deleteContest(id);
  }

  @ApiOperation({ summary: 'Get the currently active referral contest' })
  @SkipThrottle()
  @Get('active')
  async getActiveContest() {
    return this.contestsService.getActiveContest();
  }

  @ApiOperation({ summary: 'Get realtime leaderboard for active contest' })
  @SkipThrottle()
  @Get('active/leaderboard')
  async getLeaderboard() {
    return this.contestsService.getLeaderboard();
  }

  @ApiOperation({
    summary: 'Get current user rank and stats for active contest',
  })
  @SkipThrottle()
  @Get('active/my-stats')
  async getMyStats(@Req() req: Request) {
    const userId = (req.user as any)?.id;

    return this.contestsService.getMyStats(userId);
  }

  @ApiOperation({
    summary: 'Admin: Disqualify a referral due to suspected fraud',
  })
  @Role('admin')
  @Patch('admin/referrals/:id/disqualify')
  async disqualifyReferral(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.contestsService.disqualifyReferral(id, reason);
  }

  @ApiOperation({
    summary: 'Admin: Get suspicious contest participants for review',
  })
  @Role('admin')
  @Get('admin/suspicious-participants')
  async getSuspiciousParticipants() {
    return this.contestsService.getSuspiciousParticipants();
  }
}
