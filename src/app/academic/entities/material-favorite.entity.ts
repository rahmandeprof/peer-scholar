import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('material_favorite')
export class MaterialFavorite extends IDAndTimestamp {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Material, (material) => material.favorites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'material_id' })
  material: Material;
}
