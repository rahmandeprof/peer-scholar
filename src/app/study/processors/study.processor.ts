import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { UsersService } from '@/app/users/users.service';

@Injectable()
export class StudyProcessor {
  private readonly logger = new Logger(StudyProcessor.name);

  constructor(private readonly usersService: UsersService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDailyStreakCheck() {
    this.logger.debug('Running daily streak check...');
    // Logic to reset streaks or notify users
    // For now, we just log it as the logic in UsersService.updateStreak handles logic on access.
    // If we need to reset streaks for inactive users, we would do it here.
    // Example: await this.usersService.resetInactiveStreaks();
    this.logger.debug('Daily streak check completed');
  }
}
