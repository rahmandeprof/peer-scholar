import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('public_note')
export class PublicNote extends IDAndTimestamp {
  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material!: Material;

  @Column({ name: 'material_id' })
  materialId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'selected_text', type: 'text' })
  selectedText!: string;

  @Column({ name: 'note', type: 'text' })
  note!: string;

  @Column({ name: 'page_number', nullable: true })
  pageNumber!: number;

  @Column({ name: 'context_before', type: 'text', nullable: true })
  contextBefore!: string;

  @Column({ name: 'context_after', type: 'text', nullable: true })
  contextAfter!: string;

  @Column({ name: 'upvotes', type: 'int', default: 0 })
  upvotes!: number;

  @Column({ name: 'downvotes', type: 'int', default: 0 })
  downvotes!: number;

  @OneToMany(() => PublicNoteVote, (vote) => vote.note)
  votes!: PublicNoteVote[];
}

@Entity('public_note_vote')
export class PublicNoteVote extends IDAndTimestamp {
  @ManyToOne(() => PublicNote, (note) => note.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'note_id' })
  note!: PublicNote;

  @Column({ name: 'note_id' })
  noteId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'value', type: 'int' }) // 1 for upvote, -1 for downvote
  value!: number;
}
