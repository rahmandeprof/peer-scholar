import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  StudySession,
  StudySessionType,
} from './entities/study-session.entity';

import { UsersService } from '@/app/users/users.service';

import { REPUTATION_REWARDS } from '@/app/common/constants/reputation.constants';

import { Repository } from 'typeorm';

@Injectable()
export class StudyService {
  constructor(
    @InjectRepository(StudySession)
    private readonly studySessionRepo: Repository<StudySession>,
    private readonly usersService: UsersService,
  ) {}

  startSession(userId: string, type: StudySessionType) {
    const session = this.studySessionRepo.create({
      userId,
      type,
      startTime: new Date(),
      durationSeconds: 0,
    });

    return this.studySessionRepo.save(session);
  }

  async endSession(userId: string, sessionId: string) {
    const session = await this.studySessionRepo.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.endTime = new Date();
    session.durationSeconds = Math.floor(
      (session.endTime.getTime() - session.startTime.getTime()) / 1000,
    );
    session.completed = true;

    await this.studySessionRepo.save(session);

    if (
      session.type === StudySessionType.STUDY ||
      session.type === StudySessionType.TEST
    ) {
      await this.usersService.updateStreak(userId);
      await this.usersService.increaseReputation(
        userId,
        REPUTATION_REWARDS.LOW,
      );
    }

    return session;
  }

  getStreak(userId: string) {
    return this.usersService.getInsights(userId);
  }

  async getWeeklyStats(userId: string) {
    const now = new Date();
    // Get start of week (Monday)
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday

    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const sessions = await this.studySessionRepo
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.startTime >= :startOfWeek', { startOfWeek })
      .getMany();

    const totalSeconds = sessions.reduce(
      (acc, session) => acc + (session.durationSeconds || 0),
      0,
    );

    return {
      totalSeconds,
      goalSeconds: 5 * 60 * 60, // 5 Hours
    };
  }
}
