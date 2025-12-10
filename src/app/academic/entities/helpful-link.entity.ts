import { User } from '@/app/users/entities/user.entity';
import { Material } from '@/app/academic/entities/material.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';
import { Column, Entity, ManyToOne } from 'typeorm';

export enum LinkType {
    VIDEO = 'video',
    ARTICLE = 'article',
    TUTORIAL = 'tutorial',
    OTHER = 'other',
}

@Entity()
export class HelpfulLink extends IDAndTimestamp {
    @Column()
    url: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    description?: string;

    @Column({
        type: 'varchar',
        default: LinkType.OTHER,
    })
    linkType: LinkType;

    @Column({ nullable: true })
    thumbnailUrl?: string;

    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    material: Material;

    @Column()
    materialId: string;

    @ManyToOne(() => User)
    addedBy: User;

    @Column()
    addedById: string;

    @Column({ type: 'int', default: 0 })
    helpfulCount: number;
}
