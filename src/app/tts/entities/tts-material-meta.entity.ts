import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Stores pre-computed chunk boundaries for a material.
 * Used to ensure consistent chunk splitting across all users.
 */
@Entity('tts_material_meta')
export class TtsMaterialMeta {
    /**
     * Material ID (primary key - one meta per material)
     */
    @PrimaryColumn({ name: 'material_id' })
    materialId: string;

    /**
     * Total number of chunks for this material
     */
    @Column({ name: 'total_chunks' })
    totalChunks: number;

    /**
     * Pre-computed chunk boundaries (character offsets)
     * Each entry: { start: number, end: number }
     */
    @Column({ name: 'chunk_boundaries', type: 'jsonb' })
    chunkBoundaries: { start: number; end: number }[];

    /**
     * MD5 hash of material content.
     * Used to detect if material was updated and chunks need regeneration.
     */
    @Column({ name: 'content_hash', length: 32 })
    contentHash: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
