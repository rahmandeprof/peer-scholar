import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { CapitalizeTransformer } from '@/utils/transformers/capitalize';

import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class User extends IDAndTimestamp {
  @Column({
    transformer: new CapitalizeTransformer(),
  })
  firstName!: string;

  @Column({
    transformer: new CapitalizeTransformer(),
  })
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ type: String, nullable: true })
  image!: string | null;

  @Column({ default: 'user' })
  role!: string;

  @Column({ default: false })
  banned!: boolean;

  @Column({ type: String, nullable: true })
  banReason!: string | null;

  @Column({ type: Date, nullable: true })
  banExpires!: Date | null;

  @Column({ nullable: true })
  password!: string;

  @Column({ nullable: true })
  department!: string;

  @Column({ type: 'int', nullable: true })
  yearOfStudy!: number;

  @Column({ nullable: true })
  faculty!: string;

  @Column({ nullable: true })
  school: string;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  @Column({ type: 'date', nullable: true })
  lastStudyDate: Date;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @OneToMany('Material', 'uploader')
  materials: import('../../academic/entities/material.entity').Material[];

  @Column({ nullable: true })
  lastReadMaterialId: string;

  @ManyToOne('Material', { nullable: true })
  lastReadMaterial: import('../../academic/entities/material.entity').Material;

  @Column({ type: 'int', default: 1 })
  lastReadPage: number;

  @Column({ default: 0 })
  reputation: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastProfileUpdate: Date | null;

  @Column({ type: String, nullable: true })
  verificationToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  // Timer preferences (in seconds) - editable by user anytime
  @Column({ type: 'int', default: 1500 }) // 25 minutes
  studyDuration: number;

  @Column({ type: 'int', default: 300 }) // 5 minutes
  testDuration: number;

  @Column({ type: 'int', default: 600 }) // 10 minutes
  restDuration: number;
}
