import { Material } from '@/app/academic/entities/material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('note')
export class Note extends IDAndTimestamp {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material!: Material;

  @Column({ name: 'material_id' })
  materialId!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;
}
