import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class PublicNote extends IDAndTimestamp {
    @ManyToOne(() => Material, { onDelete: 'CASCADE' })
    material!: Material;

    @Column()
    materialId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @Column()
    userId!: string;

    @Column({ type: 'text' })
    selectedText!: string;

    @Column({ type: 'text' })
    note!: string;

    @Column({ nullable: true })
    pageNumber!: number;

    @Column({ type: 'text', nullable: true })
    contextBefore!: string;

    @Column({ type: 'text', nullable: true })
    contextAfter!: string;

    @Column({ type: 'int', default: 0 })
    upvotes!: number;

    @Column({ type: 'int', default: 0 })
    downvotes!: number;

    @OneToMany(() => PublicNoteVote, (vote) => vote.note)
    votes!: PublicNoteVote[];
}

@Entity()
export class PublicNoteVote extends IDAndTimestamp {
    @ManyToOne(() => PublicNote, (note) => note.votes, { onDelete: 'CASCADE' })
    note!: PublicNote;

    @Column()
    noteId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @Column()
    userId!: string;

    @Column({ type: 'int' }) // 1 for upvote, -1 for downvote
    value!: number;
}
