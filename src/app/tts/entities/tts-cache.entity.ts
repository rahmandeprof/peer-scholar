import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Cache for TTS audio files.
 * Stores generated audio URLs keyed by text hash + voice.
 * Allows sharing audio across all users to minimize API calls.
 */
@Entity('tts_cache')
@Index(['textHash', 'voice'], { unique: true })
export class TtsCache {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * MD5 hash of the text content.
     * Used for cache lookup without storing full text.
     */
    @Column({ name: 'text_hash', length: 32 })
    textHash: string;

    /**
     * Voice name used for generation (e.g., 'Idera', 'Tayo')
     */
    @Column({ length: 50 })
    voice: string;

    /**
     * URL to the cached audio file (Cloudinary/R2)
     */
    @Column({ name: 'audio_url' })
    audioUrl: string;

    /**
     * Public ID for cloud storage (for deletion if needed)
     */
    @Column({ name: 'public_id', nullable: true })
    publicId: string;

    /**
     * Audio format (mp3, wav, etc.)
     */
    @Column({ length: 10, default: 'mp3' })
    format: string;

    /**
     * Number of times this cached audio has been accessed
     */
    @Column({ name: 'access_count', default: 0 })
    accessCount: number;

    /**
     * Last time this cache entry was accessed
     */
    @Column({ name: 'last_accessed_at', nullable: true })
    lastAccessedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
