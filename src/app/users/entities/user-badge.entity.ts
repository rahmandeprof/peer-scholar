import { User } from './user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

export enum BadgeType {
  // Milestone badges
  FIRST_UPLOAD = 'first_upload',
  FIRST_READ = 'first_read',

  // Streak badges
  STREAK_3 = 'streak_3',
  STREAK_7 = 'streak_7',
  STREAK_30 = 'streak_30',

  // Time-based badges
  HOUR_10 = 'hour_10',
  HOUR_50 = 'hour_50',
  HOUR_100 = 'hour_100',

  // Time-of-day badges
  NIGHT_OWL = 'night_owl',
  EARLY_BIRD = 'early_bird',
}

export interface BadgeInfo {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGE_DEFINITIONS: Record<BadgeType, Omit<BadgeInfo, 'type'>> = {
  [BadgeType.FIRST_UPLOAD]: {
    name: 'First Upload',
    description: 'Uploaded your first material',
    icon: '🎯',
    color: '#22C55E',
  },
  [BadgeType.FIRST_READ]: {
    name: 'First Read',
    description: 'Completed your first reading session',
    icon: '📖',
    color: '#3B82F6',
  },
  [BadgeType.STREAK_3]: {
    name: '3-Day Streak',
    description: 'Studied 3 days in a row',
    icon: '🔥',
    color: '#F97316',
  },
  [BadgeType.STREAK_7]: {
    name: '7-Day Streak',
    description: 'Studied 7 days in a row',
    icon: '⚡',
    color: '#EAB308',
  },
  [BadgeType.STREAK_30]: {
    name: 'Monthly Champion',
    description: 'Studied 30 days in a row',
    icon: '🏆',
    color: '#A855F7',
  },
  [BadgeType.HOUR_10]: {
    name: '10 Hour Club',
    description: 'Studied for 10 total hours',
    icon: '⏱️',
    color: '#06B6D4',
  },
  [BadgeType.HOUR_50]: {
    name: '50 Hour Club',
    description: 'Studied for 50 total hours',
    icon: '🎖️',
    color: '#8B5CF6',
  },
  [BadgeType.HOUR_100]: {
    name: 'Century Scholar',
    description: 'Studied for 100 total hours',
    icon: '💎',
    color: '#EC4899',
  },
  [BadgeType.NIGHT_OWL]: {
    name: 'Night Owl',
    description: 'Studied after 10 PM',
    icon: '🌙',
    color: '#6366F1',
  },
  [BadgeType.EARLY_BIRD]: {
    name: 'Early Bird',
    description: 'Studied before 7 AM',
    icon: '🌅',
    color: '#F59E0B',
  },
};

@Entity('user_badge')
export class UserBadge extends IDAndTimestamp {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'badge_type',
    type: 'varchar',
  })
  badgeType: BadgeType;

  @CreateDateColumn({ name: 'unlocked_at' })
  unlockedAt: Date;
}
