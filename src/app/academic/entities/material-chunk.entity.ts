import { Material } from './material.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('material_chunk')
export class MaterialChunk extends IDAndTimestamp {
  @ManyToOne(() => Material, (material) => material.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  // Using 'float' array type to satisfy TypeORM validation
  // In production, this should ideally be a 'vector' column via migration
  @Column({ name: 'embedding', type: 'float', array: true, nullable: true })
  embedding: number[] | null;
}
