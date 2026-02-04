import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import {
  BADGE_DEFINITIONS,
  BadgeType,
  UserBadge,
} from './entities/user-badge.entity';

import { Repository } from 'typeorm';

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(UserBadge)
    private readonly badgeRepo: Repository<UserBadge>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // Check if user already has a badge
  async hasBadge(userId: string, badgeType: BadgeType): Promise<boolean> {
    const existing = await this.badgeRepo.findOne({
      where: { userId, badgeType },
    });

    return !!existing;
  }

  // Award a badge to user (returns the badge if newly awarded, null if already had)
  async awardBadge(
    userId: string,
    badgeType: BadgeType,
  ): Promise<UserBadge | null> {
    if (await this.hasBadge(userId, badgeType)) {
      return null;
    }

    const badge = this.badgeRepo.create({
      userId,
      badgeType,
    });

    return this.badgeRepo.save(badge);
  }

  // Get all badges for a user
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return this.badgeRepo.find({
      where: { userId },
      order: { unlockedAt: 'DESC' },
    });
  }

  // Check and award badges after a material upload
  async checkUploadBadges(
    userId: string,
    uploadCount: number,
  ): Promise<UserBadge[]> {
    const awarded: UserBadge[] = [];

    if (uploadCount === 1) {
      const badge = await this.awardBadge(userId, BadgeType.FIRST_UPLOAD);

      if (badge) awarded.push(badge);
    }

    return awarded;
  }

  // Check and award badges after study session
  async checkStudyBadges(
    userId: string,
    totalStudySeconds: number,
    sessionHour: number, // 0-23
    hasCompletedReading: boolean,
  ): Promise<UserBadge[]> {
    const awarded: UserBadge[] = [];

    // First read badge
    if (hasCompletedReading) {
      const badge = await this.awardBadge(userId, BadgeType.FIRST_READ);

      if (badge) awarded.push(badge);
    }

    // Time-of-day badges
    if (sessionHour >= 22 || sessionHour < 4) {
      const badge = await this.awardBadge(userId, BadgeType.NIGHT_OWL);

      if (badge) awarded.push(badge);
    }

    if (sessionHour >= 5 && sessionHour < 7) {
      const badge = await this.awardBadge(userId, BadgeType.EARLY_BIRD);

      if (badge) awarded.push(badge);
    }

    // Study time badges (convert to hours)
    const totalHours = totalStudySeconds / 3600;

    if (totalHours >= 10) {
      const badge = await this.awardBadge(userId, BadgeType.HOUR_10);

      if (badge) awarded.push(badge);
    }

    if (totalHours >= 50) {
      const badge = await this.awardBadge(userId, BadgeType.HOUR_50);

      if (badge) awarded.push(badge);
    }

    if (totalHours >= 100) {
      const badge = await this.awardBadge(userId, BadgeType.HOUR_100);

      if (badge) awarded.push(badge);
    }

    return awarded;
  }

  // Check and award streak badges
  async checkStreakBadges(
    userId: string,
    currentStreak: number,
  ): Promise<UserBadge[]> {
    const awarded: UserBadge[] = [];

    if (currentStreak >= 3) {
      const badge = await this.awardBadge(userId, BadgeType.STREAK_3);

      if (badge) awarded.push(badge);
    }

    if (currentStreak >= 7) {
      const badge = await this.awardBadge(userId, BadgeType.STREAK_7);

      if (badge) awarded.push(badge);
    }

    if (currentStreak >= 30) {
      const badge = await this.awardBadge(userId, BadgeType.STREAK_30);

      if (badge) awarded.push(badge);
    }

    return awarded;
  }

  // Get badge info for display
  getBadgeInfo(badgeType: BadgeType) {
    return {
      type: badgeType,
      ...BADGE_DEFINITIONS[badgeType],
    };
  }

  // Get all badge definitions
  getAllBadgeDefinitions() {
    return Object.entries(BADGE_DEFINITIONS).map(([type, info]) => ({
      type: type as BadgeType,
      ...info,
    }));
  }
}
