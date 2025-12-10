import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export enum StudySessionType {
  STUDY = 'study',
  TEST = 'test',
  REST = 'rest',
  READING = 'reading', // Tracks actual time viewing files
}

@Entity('study_session')
export class StudySession extends IDAndTimestamp {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({
    name: 'type',
    type: 'varchar',
    default: StudySessionType.STUDY,
  })
  type!: StudySessionType;

  @Column({ name: 'duration_seconds', type: 'int' })
  durationSeconds!: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime!: Date;

  @Column({ name: 'completed', default: false })
  completed!: boolean;
}
