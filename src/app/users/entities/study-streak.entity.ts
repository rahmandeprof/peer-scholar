import { User } from './user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity('study_streak')
export class StudyStreak extends IDAndTimestamp {
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak!: number;

  @Column({ name: 'longest_streak', default: 0 })
  longestStreak!: number;

  @Column({ name: 'last_activity_date', type: 'timestamp', nullable: true })
  lastActivityDate!: Date | null;

  // Weekly tracking for streak freeze system
  @Column({ name: 'weekly_active_days', default: 0 })
  weeklyActiveDays!: number;

  @Column({ name: 'streak_freezes', default: 0 })
  streakFreezes!: number;

  @Column({ name: 'week_start_date', type: 'date', nullable: true })
  weekStartDate!: Date | null;
}
