import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('material_report')
export class MaterialReport extends IDAndTimestamp {
  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reason' }) // 'Spam', 'Inappropriate', 'Wrong Department', 'Other'
  reason: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;
}
