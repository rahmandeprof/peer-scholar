/**
 * Quiz Types for PeerToLearn Dynamic Quiz Engine
 */

export enum QuizDifficulty {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
}

export enum QuizQuestionType {
    MCQ = 'mcq',
    FILL_BLANK = 'fill_blank',
    SHORT_RESPONSE = 'short_response',
    TRUE_FALSE = 'true_false',
    SCENARIO = 'scenario',
}

export interface QuizQuestion {
    id: string;
    type: QuizQuestionType;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
    hint?: string;
}

export interface QuizResponse {
    topic: string;
    difficulty: QuizDifficulty;
    questions: QuizQuestion[];
}

export interface QuizGenerationRequest {
    /** Topic to generate quiz about (can be extracted from material title or user-provided) */
    topic: string;

    /** Difficulty level */
    difficulty?: QuizDifficulty;

    /** Number of questions to generate */
    questionCount?: number;

    /** Optional text segment to base questions on */
    textSegment?: string;

    /** Material ID for caching purposes */
    materialId?: string;
}

export interface QuizGenerationResult {
    success: boolean;
    data?: QuizResponse;
    error?: string;
    retryCount?: number;
}
