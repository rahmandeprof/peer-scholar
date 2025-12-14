import { Column, Entity, Index, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Tracks user progress on individual flashcards for spaced repetition
 * Uses SM-2 algorithm to determine optimal review intervals
 */
@Entity('flashcard_progress')
@Index(['userId', 'materialId'])
@Index(['userId', 'nextReviewDate'])
export class FlashcardProgress {
    // Composite primary key: {userId}_{materialId}_{cardIndex}
    @PrimaryColumn({ name: 'id' })
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'material_id' })
    materialId: string;

    @Column({ name: 'card_index', type: 'int' })
    cardIndex: number;

    /**
     * Ease factor - multiplier for interval calculation
     * Default 2.5, min 1.3, adjusts based on performance
     */
    @Column({ name: 'ease_factor', type: 'float', default: 2.5 })
    easeFactor: number;

    /**
     * Current interval in days until next review
     */
    @Column({ name: 'interval', type: 'int', default: 0 })
    interval: number;

    /**
     * Number of consecutive correct reviews (rating >= 3)
     * Resets to 0 on incorrect answer
     */
    @Column({ name: 'repetitions', type: 'int', default: 0 })
    repetitions: number;

    /**
     * When this card is due for review
     */
    @Column({ name: 'next_review_date', type: 'timestamp', nullable: true })
    nextReviewDate: Date | null;

    /**
     * Last time this card was reviewed
     */
    @Column({ name: 'last_reviewed_at', type: 'timestamp', nullable: true })
    lastReviewedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    /**
     * Create composite ID from components
     */
    static createId(userId: string, materialId: string, cardIndex: number): string {
        return `${userId}_${materialId}_${cardIndex}`;
    }
}
