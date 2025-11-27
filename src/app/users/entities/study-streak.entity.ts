import { User } from './user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity()
export class StudyStreak extends IDAndTimestamp {
  @OneToOne(() => User)
  @JoinColumn()
  user!: User;

  @Column()
  userId!: string;

  @Column({ default: 0 })
  currentStreak!: number;

  @Column({ default: 0 })
  longestStreak!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityDate!: Date | null;
}
