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

  // Using 'vector' type requires pgvector extension
  // For now, we'll define it but might need to handle migration carefully
  // @ts-ignore
  @Column({ type: 'vector', nullable: true })
  embedding: number[] | null;
}
