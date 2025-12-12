/**
 * Flashcard Types for PeerToLearn Dynamic Generation Engine
 */

export interface Flashcard {
    id: string;
    front: string;
    back: string;
}

export interface FlashcardResponse {
    topic: string;
    flashcards: Flashcard[];
}

export interface FlashcardGenerationRequest {
    /** Topic to generate flashcards about */
    topic: string;

    /** Number of flashcards to generate */
    cardCount?: number;

    /** Optional text segment to base flashcards on */
    textSegment?: string;

    /** Material ID for caching purposes */
    materialId?: string;
}

export interface FlashcardGenerationResult {
    success: boolean;
    data?: Flashcard[];
    error?: string;
    retryCount?: number;
}
