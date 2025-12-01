import { Material } from './material.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class MaterialChunk extends IDAndTimestamp {
  @ManyToOne(() => Material, (material) => material.chunks, {
    onDelete: 'CASCADE',
  })
  material: Material;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  chunkIndex: number;

  // Using 'float' array type to satisfy TypeORM validation
  // In production, this should ideally be a 'vector' column via migration
  @Column({ type: 'float', array: true, nullable: true })
  embedding: number[] | null;
}
