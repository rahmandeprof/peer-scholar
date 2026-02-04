import { School } from '../../academic/entities/school.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { CapitalizeTransformer } from '@/utils/transformers/capitalize';

import { Exclude } from 'class-transformer';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('user')
export class User extends IDAndTimestamp {
  @Column({
    name: 'first_name',
    transformer: new CapitalizeTransformer(),
  })
  firstName!: string;

  @Column({
    name: 'last_name',
    transformer: new CapitalizeTransformer(),
  })
  lastName!: string;

  @Column({ name: 'email', unique: true })
  email!: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean;

  @Column({ name: 'image', type: String, nullable: true })
  image!: string | null;

  @Column({ name: 'role', default: 'user' })
  role!: string;

  @Column({ name: 'banned', default: false })
  banned!: boolean;

  @Column({ name: 'ban_reason', type: String, nullable: true })
  banReason!: string | null;

  @Column({ name: 'ban_expires', type: Date, nullable: true })
  banExpires!: Date | null;

  @Exclude()
  @Column({ name: 'password', nullable: true })
  password!: string;

  @Column({ name: 'department', nullable: true })
  department!: string;

  @Column({ name: 'year_of_study', type: 'int', nullable: true })
  yearOfStudy!: number;

  @Column({ name: 'faculty', nullable: true })
  faculty!: string;

  @Column({ name: 'school', nullable: true })
  school: string;

  // Foreign key relation to School (university)
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  schoolEntity: School | null;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_study_date', type: 'date', nullable: true })
  lastStudyDate: Date;

  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId: string;

  @OneToMany('Material', 'uploader')
  materials: import('../../academic/entities/material.entity').Material[];

  @Column({ name: 'last_read_material_id', nullable: true })
  lastReadMaterialId: string;

  @ManyToOne('Material', { nullable: true })
  @JoinColumn({ name: 'last_read_material_id' })
  lastReadMaterial: import('../../academic/entities/material.entity').Material;

  @Column({ name: 'last_read_page', type: 'int', default: 1 })
  lastReadPage: number;

  @Column({ name: 'reputation', default: 0 })
  reputation: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'last_seen', type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ name: 'last_profile_update', type: 'timestamp', nullable: true })
  lastProfileUpdate: Date | null;

  @Column({ name: 'verification_token', type: String, nullable: true })
  verificationToken: string | null;

  @Column({ name: 'reset_password_token', type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  // Timer preferences (in seconds) - editable by user anytime
  @Column({ name: 'study_duration', type: 'int', default: 1500 }) // 25 minutes
  studyDuration: number;

  @Column({ name: 'test_duration', type: 'int', default: 300 }) // 5 minutes
  testDuration: number;

  @Column({ name: 'rest_duration', type: 'int', default: 600 }) // 10 minutes
  restDuration: number;

  // Custom username (defaults to email prefix)
  @Column({ name: 'username', type: 'varchar', length: 50, nullable: true })
  username: string | null;

  // Privacy: whether to appear on leaderboards
  @Column({ name: 'show_on_leaderboard', type: 'boolean', default: true })
  showOnLeaderboard: boolean;

  // Display name preference - what to show publicly
  @Column({
    name: 'display_name_preference',
    type: 'varchar',
    length: 20,
    default: 'fullname',
  })
  displayNamePreference: 'username' | 'fullname';

  // Referral tracking - who referred this user
  @Column({ name: 'referred_by_id', type: 'uuid', nullable: true })
  referredById: string | null;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'referred_by_id' })
  referredBy: User | null;

  // Feature flags and UI preferences (synced across devices)
  @Column({ name: 'preferences', type: 'json', nullable: true, default: '{}' })
  preferences: Record<string, any>;

  // Web push notification subscription
  @Column({ name: 'push_subscription', type: 'json', nullable: true })
  pushSubscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  } | null;
}
