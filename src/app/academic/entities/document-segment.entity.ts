/**
 * DocumentSegment Entity
 * Stores text segments extracted from materials for efficient AI generation
 */
import { Material } from './material.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('document_segment')
@Index('idx_segment_material', ['materialId'])
export class DocumentSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId: string;

  @ManyToOne(() => Material, (m) => m.segments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ name: 'page_start', nullable: true })
  pageStart?: number;

  @Column({ name: 'page_end', nullable: true })
  pageEnd?: number;

  @Column({ name: 'heading', nullable: true, length: 500 })
  heading?: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'token_count' })
  tokenCount: number;

  @Column({ name: 'segment_index' })
  segmentIndex: number;

  @Column({ name: 'source', type: 'varchar', length: 20, default: 'text' })
  source: 'text' | 'ocr';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
