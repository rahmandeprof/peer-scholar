import { Department } from '@/app/academic/entities/department.entity';
import { Faculty } from '@/app/academic/entities/faculty.entity';
import { School } from '@/app/academic/entities/school.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { CapitalizeTransformer } from '@/utils/transformers/capitalize';

import { Column, Entity, ManyToOne } from 'typeorm';

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

  @ManyToOne(() => Department, { nullable: true })
  department: Department;

  @Column({ type: 'int', nullable: true })
  yearOfStudy!: number;

  @ManyToOne(() => Faculty, { nullable: true })
  faculty: Faculty;

  @ManyToOne(() => School, { nullable: true })
  school: School;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  @Column({ type: 'date', nullable: true })
  lastStudyDate: Date;

  @Column({ nullable: true })
  partnerId: string;

  @Column({ nullable: true, unique: true })
  googleId: string;
}
