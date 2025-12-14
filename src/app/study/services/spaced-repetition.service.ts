import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Or } from 'typeorm';
import { FlashcardProgress } from '../entities/flashcard-progress.entity';

/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Incorrect, remembered upon seeing answer
 * 2 - Incorrect, answer seemed easy to recall
 * 3 - Correct with difficulty
 * 4 - Correct with hesitation
 * 5 - Perfect recall
 */
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface DueCard {
    cardIndex: number;
    progress: FlashcardProgress | null;
    isNew: boolean;
}

export interface ReviewResult {
    cardIndex: number;
    newEaseFactor: number;
    newInterval: number;
    nextReviewDate: Date;
}

@Injectable()
export class SpacedRepetitionService {
    private readonly logger = new Logger(SpacedRepetitionService.name);

    constructor(
        @InjectRepository(FlashcardProgress)
        private readonly progressRepo: Repository<FlashcardProgress>,
    ) { }

    /**
     * Get all cards due for review for a user and material
     * Includes cards that have never been reviewed (new cards)
     */
    async getDueCards(
        userId: string,
        materialId: string,
        totalCards: number,
    ): Promise<DueCard[]> {
        const now = new Date();

        // Get all existing progress for this user/material
        const existingProgress = await this.progressRepo.find({
            where: {
                userId,
                materialId,
            },
        });

        const progressMap = new Map<number, FlashcardProgress>();
        for (const p of existingProgress) {
            progressMap.set(p.cardIndex, p);
        }

        const dueCards: DueCard[] = [];

        // Check each card
        for (let i = 0; i < totalCards; i++) {
            const progress = progressMap.get(i);

            if (!progress) {
                // New card - never reviewed
                dueCards.push({ cardIndex: i, progress: null, isNew: true });
            } else if (!progress.nextReviewDate || progress.nextReviewDate <= now) {
                // Due for review
                dueCards.push({ cardIndex: i, progress, isNew: false });
            }
        }

        // Sort: new cards first, then by due date
        dueCards.sort((a, b) => {
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            if (a.progress?.nextReviewDate && b.progress?.nextReviewDate) {
                return a.progress.nextReviewDate.getTime() - b.progress.nextReviewDate.getTime();
            }
            return 0;
        });

        return dueCards;
    }

    /**
     * Get stats for a user's progress on a material
     */
    async getProgressStats(userId: string, materialId: string, totalCards: number) {
        const now = new Date();

        const existingProgress = await this.progressRepo.find({
            where: { userId, materialId },
        });

        let studied = 0;
        let due = 0;
        let learning = 0; // interval < 21 days
        let mature = 0;   // interval >= 21 days

        for (const p of existingProgress) {
            studied++;
            if (!p.nextReviewDate || p.nextReviewDate <= now) {
                due++;
            }
            if (p.interval >= 21) {
                mature++;
            } else {
                learning++;
            }
        }

        return {
            total: totalCards,
            studied,
            new: totalCards - studied,
            due,
            learning,
            mature,
        };
    }

    /**
     * Record a review result and update progress using SM-2 algorithm
     */
    async recordReview(
        userId: string,
        materialId: string,
        cardIndex: number,
        quality: QualityRating,
    ): Promise<ReviewResult> {
        const id = FlashcardProgress.createId(userId, materialId, cardIndex);

        let progress = await this.progressRepo.findOne({ where: { id } });

        if (!progress) {
            // First time reviewing this card
            progress = new FlashcardProgress();
            progress.id = id;
            progress.userId = userId;
            progress.materialId = materialId;
            progress.cardIndex = cardIndex;
            progress.easeFactor = 2.5;
            progress.interval = 0;
            progress.repetitions = 0;
        }

        // Apply SM-2 algorithm
        const result = this.calculateSM2(
            quality,
            progress.easeFactor,
            progress.interval,
            progress.repetitions,
        );

        progress.easeFactor = result.easeFactor;
        progress.interval = result.interval;
        progress.repetitions = result.repetitions;
        progress.nextReviewDate = result.nextReviewDate;
        progress.lastReviewedAt = new Date();

        await this.progressRepo.save(progress);

        this.logger.debug(
            `Review recorded: card ${cardIndex}, quality ${quality}, ` +
            `new interval ${result.interval} days, next review ${result.nextReviewDate.toISOString()}`,
        );

        return {
            cardIndex,
            newEaseFactor: result.easeFactor,
            newInterval: result.interval,
            nextReviewDate: result.nextReviewDate,
        };
    }

    /**
     * SM-2 Algorithm Implementation
     * 
     * EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
     * where q is quality (0-5) and EF is current ease factor
     * 
     * If quality >= 3:
     *   - rep 0: interval = 1 day
     *   - rep 1: interval = 6 days
     *   - rep 2+: interval = previous * EF
     * 
     * If quality < 3:
     *   - Reset repetitions to 0
     *   - Interval = 1 day (relearn)
     */
    private calculateSM2(
        quality: QualityRating,
        currentEF: number,
        currentInterval: number,
        currentReps: number,
    ): {
        easeFactor: number;
        interval: number;
        repetitions: number;
        nextReviewDate: Date;
    } {
        // Calculate new ease factor
        let newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        // Minimum ease factor is 1.3
        newEF = Math.max(1.3, newEF);

        let newInterval: number;
        let newReps: number;

        if (quality >= 3) {
            // Correct answer
            newReps = currentReps + 1;

            if (newReps === 1) {
                newInterval = 1;
            } else if (newReps === 2) {
                newInterval = 6;
            } else {
                newInterval = Math.round(currentInterval * newEF);
            }
        } else {
            // Incorrect answer - reset
            newReps = 0;
            newInterval = 1;
        }

        // Calculate next review date
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

        return {
            easeFactor: Math.round(newEF * 100) / 100, // Round to 2 decimal places
            interval: newInterval,
            repetitions: newReps,
            nextReviewDate,
        };
    }

    /**
     * Reset progress for a specific card
     */
    async resetCard(userId: string, materialId: string, cardIndex: number): Promise<void> {
        const id = FlashcardProgress.createId(userId, materialId, cardIndex);
        await this.progressRepo.delete({ id });
    }

    /**
     * Reset all progress for a material
     */
    async resetMaterial(userId: string, materialId: string): Promise<void> {
        await this.progressRepo.delete({ userId, materialId });
    }
}
