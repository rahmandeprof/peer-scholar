import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';
import { User } from './user.entity';
import { Material } from '@/app/academic/entities/material.entity';

@Entity('reading_progress')
@Unique(['userId', 'materialId'])
export class ReadingProgress extends IDAndTimestamp {
    @Column({ name: 'user_id' })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'material_id' })
    materialId!: string;

    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'material_id' })
    material!: Material;

    @Column({ name: 'last_page', type: 'int', default: 1 })
    lastPage!: number;
}
