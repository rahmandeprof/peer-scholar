import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';

import { PushService } from '@/app/notifications/push.service';
import { UsersService } from '@/app/users/users.service';

import { In, LessThan, Not, Repository } from 'typeorm';

@Injectable()
export class StudyProcessor {
  private readonly logger = new Logger(StudyProcessor.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly pushService: PushService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(StudyStreak)
    private readonly streakRepo: Repository<StudyStreak>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStreakCheck() {
    this.logger.debug('Running daily streak check...');

    try {
      // Find streaks that are active but user has been inactive for 2+ days
      // and has no freezes to cover the gap
      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const brokenStreaks = await this.streakRepo.find({
        where: {
          currentStreak: Not(0),
          lastActivityDate: LessThan(yesterday),
          streakFreezes: 0,
        },
      });

      let resetCount = 0;

      for (const streak of brokenStreaks) {
        streak.currentStreak = 0;
        await this.streakRepo.save(streak);
        await this.userRepo.update(streak.userId, { currentStreak: 0 });
        resetCount++;
      }

      this.logger.debug(
        `Daily streak check: reset ${resetCount} broken streaks`,
      );
    } catch (error) {
      this.logger.error('Failed to run daily streak check', error);
    }
  }

  // Run at 9 PM daily to warn users about potential streak loss
  @Cron('0 21 * * *')
  async handleStreakWarning() {
    this.logger.debug('Running streak warning notifications...');

    try {
      // Find users with active streaks who haven't studied today
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      // Get streaks that are active but haven't been updated today
      const activeStreaks = await this.streakRepo.find({
        where: {
          currentStreak: Not(0),
          lastActivityDate: LessThan(today),
        },
      });

      if (activeStreaks.length === 0) {
        this.logger.debug('Streak warning: no active streaks need warning');

        return;
      }

      // Batch-fetch all users instead of querying one-by-one (N+1 fix)
      const userIds = activeStreaks.map((s) => s.userId);
      const users = await this.userRepo.find({
        where: { id: In(userIds) },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      let notificationsSent = 0;

      for (const streak of activeStreaks) {
        const user = userMap.get(streak.userId);

        if (user?.pushSubscription) {
          const sent = await this.pushService.sendStreakWarningNotification(
            user.pushSubscription,
            streak.currentStreak,
          );

          if (sent) notificationsSent++;
        }
      }

      this.logger.debug(
        `Streak warning: sent ${notificationsSent} notifications`,
      );
    } catch (error) {
      this.logger.error('Failed to send streak warning notifications', error);
    }
  }
}
