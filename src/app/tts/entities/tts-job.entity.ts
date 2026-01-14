import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum TtsJobStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    RATE_LIMITED = 'rate_limited', // YarnGPT daily limit reached
}

/**
 * Tracks TTS streaming jobs for progressive audio playback.
 * Each job can have multiple chunks that are generated sequentially.
 */
@Entity('tts_job')
export class TtsJob {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * MD5 hash of the text content for cache lookup
     */
    @Column({ name: 'text_hash', length: 32 })
    textHash: string;

    /**
     * Voice name used for generation
     */
    @Column({ length: 50 })
    voice: string;

    /**
     * Audio format
     */
    @Column({ length: 10, default: 'mp3' })
    format: string;

    /**
     * Current status of the job
     */
    @Column({
        type: 'enum',
        enum: TtsJobStatus,
        default: TtsJobStatus.PENDING,
    })
    status: TtsJobStatus;

    /**
     * Total number of chunks expected
     */
    @Column({ name: 'total_chunks', default: 0 })
    totalChunks: number;

    /**
     * Number of chunks completed
     */
    @Column({ name: 'completed_chunks', default: 0 })
    completedChunks: number;

    /**
     * Array of chunk URLs in order
     * Stored as JSONB for efficient querying
     */
    @Column({ name: 'chunk_urls', type: 'jsonb', default: [] })
    chunkUrls: string[];

    /**
     * Final combined audio URL (when all chunks are ready)
     */
    @Column({ name: 'final_url', nullable: true })
    finalUrl: string;

    /**
     * Error message if job failed
     */
    @Column({ name: 'error_message', nullable: true })
    errorMessage: string;

    /**
     * User ID who requested this job (for cleanup/limits)
     */
    @Column({ name: 'user_id', nullable: true })
    userId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
