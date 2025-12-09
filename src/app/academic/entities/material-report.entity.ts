import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class MaterialReport extends IDAndTimestamp {
  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  material: Material;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reporter: User;

  @Column()
  reason: string; // 'Spam', 'Inappropriate', 'Wrong Department', 'Other'

  @Column({ type: 'text', nullable: true })
  description: string;
}
