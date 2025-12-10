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
  ) { }

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
      session.type === StudySessionType.TEST ||
      session.type === StudySessionType.READING
    ) {
      await this.usersService.updateStreak(userId);
      await this.usersService.increaseReputation(
        userId,
        REPUTATION_REWARDS.LOW,
      );
    }

    return session;
  }

  /**
   * Start or continue a reading session for file viewing
   * Returns existing active session or creates new one
   */
  async startOrContinueReadingSession(userId: string) {
    // Find any active reading session in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const activeSession = await this.studySessionRepo.findOne({
      where: {
        userId,
        type: StudySessionType.READING,
        completed: false,
      },
      order: { startTime: 'DESC' },
    });

    if (activeSession && activeSession.startTime > thirtyMinutesAgo) {
      return activeSession;
    }

    // Close the old session if it exists
    if (activeSession) {
      activeSession.completed = true;
      activeSession.endTime = new Date();
      await this.studySessionRepo.save(activeSession);
    }

    // Create new reading session
    const session = this.studySessionRepo.create({
      userId,
      type: StudySessionType.READING,
      startTime: new Date(),
      durationSeconds: 0,
    });

    return this.studySessionRepo.save(session);
  }

  /**
   * Heartbeat to update reading session duration
   * Called every 30 seconds from the frontend while viewing a file
   */
  async readingHeartbeat(userId: string, sessionId: string, seconds: number) {
    const session = await this.studySessionRepo.findOne({
      where: { id: sessionId, userId, type: StudySessionType.READING },
    });

    if (!session) {
      throw new NotFoundException('Reading session not found');
    }

    // Update duration
    session.durationSeconds = seconds;
    await this.studySessionRepo.save(session);

    return { success: true, durationSeconds: session.durationSeconds };
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

  /**
   * Get activity history for the last N days
   * Returns an array of { date: string, minutes: number, sessions: number }
   */
  async getActivityHistory(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await this.studySessionRepo
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.startTime >= :startDate', { startDate })
      .andWhere('session.completed = true')
      .orderBy('session.startTime', 'ASC')
      .getMany();

    // Group sessions by date
    const activityMap = new Map<
      string,
      { minutes: number; sessions: number }
    >();

    for (const session of sessions) {
      const dateKey = session.startTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const existing = activityMap.get(dateKey) || { minutes: 0, sessions: 0 };
      existing.minutes += Math.round((session.durationSeconds || 0) / 60);
      existing.sessions += 1;
      activityMap.set(dateKey, existing);
    }

    // Convert to array with all dates (including empty ones)
    const result: { date: string; minutes: number; sessions: number }[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const activity = activityMap.get(dateKey) || { minutes: 0, sessions: 0 };
      result.push({
        date: dateKey,
        ...activity,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }
}
