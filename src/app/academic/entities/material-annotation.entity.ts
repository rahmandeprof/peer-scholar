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

  @Column({ name: 'year' })
  year: string; // e.g., "2023"

  @Column({ name: 'session' })
  session: string; // e.g., "First Semester"

  @Column({ name: 'context_before', type: 'text', nullable: true }) // To help locate text if positions shift (optional but good for robustness)
  contextBefore: string;

  @Column({ name: 'context_after', type: 'text', nullable: true })
  contextAfter: string;

  @Column({ name: 'type', default: 'note' })
  type: 'note' | 'pq'; // 'pq' = Past Question
}
