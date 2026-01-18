import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';

import { UsersService } from '@/app/users/users.service';
import { PushService } from '@/app/notifications/push.service';
import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';

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
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDailyStreakCheck() {
    this.logger.debug('Running daily streak check...');
    // Logic to reset streaks or notify users
    // For now, we just log it as the logic in UsersService.updateStreak handles logic on access.
    // If we need to reset streaks for inactive users, we would do it here.
    // Example: await this.usersService.resetInactiveStreaks();
    this.logger.debug('Daily streak check completed');
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

      let notificationsSent = 0;

      for (const streak of activeStreaks) {
        // Get the user for this streak
        const user = await this.userRepo.findOne({ where: { id: streak.userId } });

        if (user?.pushSubscription) {
          const sent = await this.pushService.sendStreakWarningNotification(
            user.pushSubscription,
            streak.currentStreak,
          );
          if (sent) notificationsSent++;
        }
      }

      this.logger.debug(`Streak warning: sent ${notificationsSent} notifications`);
    } catch (error) {
      this.logger.error('Failed to send streak warning notifications', error);
    }
  }
}
