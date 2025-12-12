/**
 * Zod Validation Schemas for Flashcard Generation
 */
import { z } from 'zod';

export const FlashcardSchema = z.object({
    id: z.string(),
    front: z.string().min(5, 'Front must be at least 5 characters'),
    back: z.string().min(5, 'Back must be at least 5 characters'),
});

export const FlashcardArraySchema = z.array(FlashcardSchema).min(1, 'Must have at least 1 flashcard');

// Infer types from schemas
export type ValidatedFlashcard = z.infer<typeof FlashcardSchema>;

/**
 * Validate flashcard response from LLM
 */
export function validateFlashcardResponse(data: unknown): {
    success: boolean;
    data?: ValidatedFlashcard[];
    errors?: z.ZodError;
} {
    const result = FlashcardArraySchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return { success: false, errors: result.error };
}
