import { Material } from '@/app/academic/entities/material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class Comment extends IDAndTimestamp {
  @Column('text')
  content: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  material: Material;
}
