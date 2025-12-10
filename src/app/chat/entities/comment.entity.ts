import { Material } from '@/app/academic/entities/material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('comment')
export class Comment extends IDAndTimestamp {
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;
}
