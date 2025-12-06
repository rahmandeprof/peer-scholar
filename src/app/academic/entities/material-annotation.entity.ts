import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';

@Entity()
export class MaterialAnnotation extends IDAndTimestamp {
    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    material: Material;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @Column({ type: 'text' })
    selectedText: string;

    @Column({ nullable: true })
    pageNumber: number;

    @Column()
    year: string; // e.g., "2023"

    @Column()
    session: string; // e.g., "First Semester"

    @Column({ type: 'text', nullable: true })
    contextBefore: string; // To help locate text if positions shift (optional but good for robustness)

    @Column({ type: 'text', nullable: true })
    contextAfter: string;
}
