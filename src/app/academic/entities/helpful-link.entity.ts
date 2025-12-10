import { User } from '@/app/users/entities/user.entity';
import { Material } from '@/app/academic/entities/material.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export enum LinkType {
    VIDEO = 'video',
    ARTICLE = 'article',
    TUTORIAL = 'tutorial',
    OTHER = 'other',
}

@Entity('helpful_link')
export class HelpfulLink extends IDAndTimestamp {
    @Column({ name: 'url' })
    url: string;

    @Column({ name: 'title' })
    title: string;

    @Column({ name: 'description', nullable: true })
    description?: string;

    @Column({
        name: 'link_type',
        type: 'varchar',
        default: LinkType.OTHER,
    })
    linkType: LinkType;

    @Column({ name: 'thumbnail_url', nullable: true })
    thumbnailUrl?: string;

    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'material_id' })
    material: Material;

    @Column({ name: 'material_id' })
    materialId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'added_by_id' })
    addedBy: User;

    @Column({ name: 'added_by_id' })
    addedById: string;

    @Column({ name: 'helpful_count', type: 'int', default: 0 })
    helpfulCount: number;
}
