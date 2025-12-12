/**
 * Zod Validation Schemas for Quiz Generation
 */
import { z } from 'zod';
import { QuizDifficulty, QuizQuestionType } from '../types';

export const QuizQuestionSchema = z.object({
    id: z.string(),
    type: z.nativeEnum(QuizQuestionType).or(z.string()), // Allow string for flexibility
    question: z.string().min(10, 'Question must be at least 10 characters'),
    options: z.array(z.string()).min(2, 'Must have at least 2 options'),
    answer: z.string().min(1, 'Answer is required'),
    explanation: z.string().min(10, 'Explanation must be at least 10 characters'),
    hint: z.string().optional(),
});

export const QuizResponseSchema = z.object({
    topic: z.string().min(1),
    difficulty: z.nativeEnum(QuizDifficulty).or(z.string()),
    questions: z.array(QuizQuestionSchema).min(1, 'Must have at least 1 question'),
});

// Infer types from schemas
export type ValidatedQuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type ValidatedQuizResponse = z.infer<typeof QuizResponseSchema>;

/**
 * Validate a quiz response from LLM
 */
export function validateQuizResponse(data: unknown): {
    success: boolean;
    data?: ValidatedQuizResponse;
    errors?: z.ZodError;
} {
    const result = QuizResponseSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return { success: false, errors: result.error };
}

/**
 * Validate a partial quiz response (just questions array)
 */
export function validateQuizQuestions(data: unknown): {
    success: boolean;
    data?: ValidatedQuizQuestion[];
    errors?: z.ZodError;
} {
    const schema = z.array(QuizQuestionSchema);
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return { success: false, errors: result.error };
}
