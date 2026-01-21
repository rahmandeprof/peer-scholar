import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('material_annotation')
export class MaterialAnnotation extends IDAndTimestamp {
  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'selected_text', type: 'text' })
  selectedText: string;

  @Column({ name: 'page_number', nullable: true })
  pageNumber: number;

  @Column({ name: 'year', nullable: true })
  year: string; // e.g., "2023" - required for PQ, null for notes

  @Column({ name: 'session', nullable: true })
  session: string; // e.g., "First Semester" - required for PQ, null for notes

  @Column({ name: 'note_content', type: 'text', nullable: true })
  noteContent: string; // User's explanation for notes

  @Column({ name: 'context_before', type: 'text', nullable: true }) // To help locate text if positions shift (optional but good for robustness)
  contextBefore: string;

  @Column({ name: 'context_after', type: 'text', nullable: true })
  contextAfter: string;

  @Column({ name: 'type', default: 'note' })
  type: 'note' | 'pq'; // 'pq' = Past Question
}
