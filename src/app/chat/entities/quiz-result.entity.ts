import { Material } from '@/app/academic/entities/material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class QuizResult extends IDAndTimestamp {
  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  totalQuestions: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  material: Material;
}
