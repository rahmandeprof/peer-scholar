import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';

export enum FlagReason {
    WRONG_CONTENT = 'wrong_content',
    LOW_QUALITY = 'low_quality',
    DUPLICATE = 'duplicate',
    INAPPROPRIATE = 'inappropriate',
    OTHER = 'other',
}

export enum FlagStatus {
    PENDING = 'pending',
    REVIEWED = 'reviewed',
    DISMISSED = 'dismissed',
}

@Entity('material_flag')
export class MaterialFlag extends IDAndTimestamp {
    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'material_id' })
    material: Material;

    @Column({ name: 'material_id' })
    materialId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({
        name: 'reason',
        type: 'varchar',
        default: FlagReason.OTHER,
    })
    reason: FlagReason;

    @Column({ name: 'description', nullable: true })
    description?: string;

    @Column({
        name: 'status',
        type: 'varchar',
        default: FlagStatus.PENDING,
    })
    status: FlagStatus;
}
