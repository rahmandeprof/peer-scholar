import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

export enum StudySessionType {
  STUDY = 'study',
  TEST = 'test',
  REST = 'rest',
}

@Entity()
export class StudySession extends IDAndTimestamp {
  @ManyToOne(() => User)
  user!: User;

  @Column()
  userId!: string;

  @Column({
    type: 'simple-enum',
    enum: StudySessionType,
    default: StudySessionType.STUDY,
  })
  type!: StudySessionType;

  @Column({ type: 'int' })
  durationSeconds!: number;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime!: Date;

  @Column({ default: false })
  completed!: boolean;
}
