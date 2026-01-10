import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Index,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Material } from '@/app/academic/entities/material.entity';

@Entity()
@Index(['user', 'viewedAt']) // For efficient queries by user ordered by time
export class ViewingHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' }) // Explicitly map to camelCase column to match DB
    user: User;

    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'materialId' }) // Fixes: 42703 Missing Column hint "ViewingHistory.materialId"
    material: Material;

    @Column({ default: 1 })
    lastPage: number;

    @CreateDateColumn()
    viewedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
