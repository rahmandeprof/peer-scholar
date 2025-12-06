import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class MaterialRating extends IDAndTimestamp {
  @Column({ type: 'int' })
  value: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Material, (material) => material.ratings, {
    onDelete: 'CASCADE',
  })
  material: Material;
}
