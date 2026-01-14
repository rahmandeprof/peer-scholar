import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

export enum TtsMaterialChunkStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * Stores individual TTS audio chunks for a material.
 * Keyed by materialId + chunkIndex + voice for cache reuse across users.
 */
@Entity('tts_material_chunk')
@Index(['materialId', 'chunkIndex', 'voice'], { unique: true })
export class TtsMaterialChunk {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Reference to the material this chunk belongs to
     */
    @Column({ name: 'material_id' })
    materialId: string;

    /**
     * Sequential chunk index (0, 1, 2, 3...)
     */
    @Column({ name: 'chunk_index' })
    chunkIndex: number;

    /**
     * Voice name used for generation
     */
    @Column({ length: 50 })
    voice: string;

    /**
     * URL to the generated audio (null = not generated yet)
     */
    @Column({ name: 'audio_url', type: 'text', nullable: true })
    audioUrl: string | null;

    /**
     * Current generation status
     */
    @Column({
        type: 'enum',
        enum: TtsMaterialChunkStatus,
        default: TtsMaterialChunkStatus.PENDING,
    })
    status: TtsMaterialChunkStatus;

    /**
     * Character offset start in material content
     */
    @Column({ name: 'char_start' })
    charStart: number;

    /**
     * Character offset end in material content
     */
    @Column({ name: 'char_end' })
    charEnd: number;

    /**
     * Error message if generation failed
     */
    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
