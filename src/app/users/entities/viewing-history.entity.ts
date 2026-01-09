import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';
import { Material } from '@/app/academic/entities/material.entity';

@Entity()
@Index(['user', 'viewedAt']) // For efficient queries by user ordered by time
export class ViewingHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    material: Material;

    @Column({ default: 1 })
    lastPage: number;

    @CreateDateColumn()
    viewedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
