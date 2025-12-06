import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';
import { Entity, ManyToOne } from 'typeorm';

@Entity()
export class MaterialFavorite extends IDAndTimestamp {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Material, (material) => material.favorites, {
        onDelete: 'CASCADE',
    })
    material: Material;
}
