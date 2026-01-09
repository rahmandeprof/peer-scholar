import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Index,
} from 'typeorm';
import { User } from '@/app/users/entities/user.entity';
import { Material } from './material.entity';

@Entity()
@Index(['user', 'material']) // For efficient queries by user+material
export class PageBookmark {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    material: Material;

    @Column()
    pageNumber: number;

    @Column({ nullable: true, length: 100 })
    note: string; // Optional label/note for the bookmark

    @CreateDateColumn()
    createdAt: Date;
}
