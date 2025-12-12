/**
 * Flashcard Generator - Generates flashcards using LLM with validation and retry
 */
import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../services/llm.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { validateFlashcardResponse } from '../schemas/flashcard.schema';
import {
    Flashcard,
    FlashcardGenerationRequest,
    FlashcardGenerationResult,
} from '../types';

@Injectable()
export class FlashcardGenerator {
    private readonly logger = new Logger(FlashcardGenerator.name);
    private readonly maxValidationRetries = 3;

    constructor(
        private readonly llmService: LLMService,
        private readonly promptBuilder: PromptBuilderService,
    ) { }

    /**
     * Generate flashcards based on the request parameters
     */
    async generate(request: FlashcardGenerationRequest): Promise<FlashcardGenerationResult> {
        const {
            topic,
            cardCount = 10,
            textSegment,
        } = request;

        if (!topic || topic.trim().length === 0) {
            return { success: false, error: 'Topic is required for flashcard generation' };
        }

        this.logger.debug(`Generating flashcards: topic="${topic}", count=${cardCount}`);

        // Build prompts
        const { systemPrompt, userPrompt } = this.promptBuilder.buildFlashcardPrompts(
            topic,
            cardCount,
            textSegment,
        );

        let lastError = '';
        let totalAttempts = 0;

        // Retry loop for validation failures
        for (let retry = 0; retry < this.maxValidationRetries; retry++) {
            // Call LLM
            const llmResponse = await this.llmService.call({
                systemPrompt,
                userPrompt,
                temperature: 0.7 + (retry * 0.1), // Slightly increase temperature on retries
            });

            totalAttempts++;

            if (!llmResponse.success || !llmResponse.content) {
                lastError = llmResponse.error || 'Failed to get LLM response';
                this.logger.warn(`LLM call failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            // Parse JSON
            const parseResult = this.llmService.parseJSON<Flashcard[]>(llmResponse.content);

            if (!parseResult.success || !parseResult.data) {
                lastError = parseResult.error || 'Failed to parse JSON response';
                this.logger.warn(`JSON parse failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            // Validate with Zod
            const validationResult = validateFlashcardResponse(parseResult.data);

            if (!validationResult.success) {
                lastError = validationResult.errors?.message || 'Schema validation failed';
                this.logger.warn(`Validation failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            // Success!
            this.logger.debug(`Flashcards generated successfully after ${totalAttempts} attempt(s)`);

            return {
                success: true,
                data: validationResult.data as Flashcard[],
                retryCount: totalAttempts,
            };
        }

        // All retries failed
        this.logger.error(`Flashcard generation failed after ${totalAttempts} attempts: ${lastError}`);

        return {
            success: false,
            error: `Failed to generate flashcards after ${totalAttempts} attempts: ${lastError}`,
            retryCount: totalAttempts,
        };
    }

    /**
     * Generate flashcards from material content
     */
    async generateFromMaterial(
        materialTitle: string,
        materialContent: string,
        cardCount: number = 10,
    ): Promise<FlashcardGenerationResult> {
        return this.generate({
            topic: materialTitle,
            cardCount,
            textSegment: materialContent,
        });
    }
}
