/**
 * Quiz Generator - Generates quizzes using LLM with validation and retry
 */
import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../services/llm.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { validateQuizResponse } from '../schemas/quiz.schema';
import {
    QuizDifficulty,
    QuizGenerationRequest,
    QuizGenerationResult,
    QuizResponse,
} from '../types';

@Injectable()
export class QuizGenerator {
    private readonly logger = new Logger(QuizGenerator.name);
    private readonly maxValidationRetries = 3;

    constructor(
        private readonly llmService: LLMService,
        private readonly promptBuilder: PromptBuilderService,
    ) { }

    /**
     * Generate a quiz based on the request parameters
     */
    async generate(request: QuizGenerationRequest): Promise<QuizGenerationResult> {
        const {
            topic,
            difficulty = QuizDifficulty.INTERMEDIATE,
            questionCount = 5,
            textSegment,
        } = request;

        if (!topic || topic.trim().length === 0) {
            return { success: false, error: 'Topic is required for quiz generation' };
        }

        this.logger.debug(`Generating quiz: topic="${topic}", difficulty=${difficulty}, count=${questionCount}`);

        // Build prompts
        const { systemPrompt, userPrompt } = this.promptBuilder.buildQuizPrompts(
            topic,
            difficulty,
            questionCount,
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
            const parseResult = this.llmService.parseJSON<QuizResponse>(llmResponse.content);

            if (!parseResult.success || !parseResult.data) {
                lastError = parseResult.error || 'Failed to parse JSON response';
                this.logger.warn(`JSON parse failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            // Validate with Zod
            const validationResult = validateQuizResponse(parseResult.data);

            if (!validationResult.success) {
                lastError = validationResult.errors?.message || 'Schema validation failed';
                this.logger.warn(`Validation failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            // Success!
            this.logger.debug(`Quiz generated successfully after ${totalAttempts} attempt(s)`);

            return {
                success: true,
                data: validationResult.data as QuizResponse,
                retryCount: totalAttempts,
            };
        }

        // All retries failed
        this.logger.error(`Quiz generation failed after ${totalAttempts} attempts: ${lastError}`);

        return {
            success: false,
            error: `Failed to generate quiz after ${totalAttempts} attempts: ${lastError}`,
            retryCount: totalAttempts,
        };
    }

    /**
     * Generate quiz from material content (with topic extraction)
     */
    async generateFromMaterial(
        materialTitle: string,
        materialContent: string,
        difficulty: QuizDifficulty = QuizDifficulty.INTERMEDIATE,
        questionCount: number = 5,
    ): Promise<QuizGenerationResult> {
        // Use title as topic, content as text segment
        return this.generate({
            topic: materialTitle,
            difficulty,
            questionCount,
            textSegment: materialContent,
        });
    }
}
