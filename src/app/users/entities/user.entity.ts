import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { CapitalizeTransformer } from '@/utils/transformers/capitalize';

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
}
