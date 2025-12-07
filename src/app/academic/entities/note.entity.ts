import { Material } from '@/app/academic/entities/material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class Note extends IDAndTimestamp {
  @ManyToOne(() => User)
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Material)
  material!: Material;

  @Column()
  materialId!: string;

  @Column({ type: 'text' })
  content!: string;
}
