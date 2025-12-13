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

    /**
     * Generate quiz from document segments (preferred method)
     * This ensures AI only uses provided segment content
     */
    async generateFromSegments(
        segments: Array<{ text: string; pageStart?: number; pageEnd?: number; heading?: string }>,
        topic: string,
        difficulty: QuizDifficulty = QuizDifficulty.INTERMEDIATE,
        questionCount: number = 5,
    ): Promise<QuizGenerationResult> {
        if (!segments || segments.length === 0) {
            return { success: false, error: 'No segments provided for quiz generation' };
        }

        if (!topic || topic.trim().length === 0) {
            return { success: false, error: 'Topic is required for quiz generation' };
        }

        // Calculate total tokens from segments (rough estimate: 4 chars = 1 token)
        const totalChars = segments.reduce((sum, seg) => sum + (seg.text?.length || 0), 0);
        const estimatedTokens = Math.ceil(totalChars / 4);

        // Scale question count based on content size (minimum 50 tokens per question)
        const TOKENS_PER_QUESTION = 50;
        const maxQuestionsForContent = Math.max(1, Math.floor(estimatedTokens / TOKENS_PER_QUESTION));
        const adjustedQuestionCount = Math.min(questionCount, maxQuestionsForContent);

        if (adjustedQuestionCount < questionCount) {
            this.logger.warn(
                `Content too short for ${questionCount} questions (${estimatedTokens} tokens). ` +
                `Scaling down to ${adjustedQuestionCount} question(s).`
            );
        }

        // Check minimum content threshold
        if (estimatedTokens < TOKENS_PER_QUESTION) {
            return {
                success: false,
                error: `Content too short to generate quiz questions. Need at least ${TOKENS_PER_QUESTION} tokens of content, but only have ${estimatedTokens}.`,
            };
        }

        this.logger.debug(
            `Generating quiz from ${segments.length} segments: topic="${topic}", difficulty=${difficulty}, count=${adjustedQuestionCount} (original: ${questionCount}, tokens: ${estimatedTokens})`,
        );

        // Build segment-aware prompts with adjusted question count
        const { systemPrompt, userPrompt } = this.promptBuilder.buildQuizPromptsFromSegments(
            segments,
            topic,
            difficulty,
            adjustedQuestionCount,
        );

        let lastError = '';
        let totalAttempts = 0;

        // Retry loop for validation failures
        for (let retry = 0; retry < this.maxValidationRetries; retry++) {
            const llmResponse = await this.llmService.call({
                systemPrompt,
                userPrompt,
                temperature: 0.7 + (retry * 0.1),
            });

            totalAttempts++;

            if (!llmResponse.success || !llmResponse.content) {
                lastError = llmResponse.error || 'Failed to get LLM response';
                this.logger.warn(`LLM call failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            const parseResult = this.llmService.parseJSON<QuizResponse>(llmResponse.content);

            if (!parseResult.success || !parseResult.data) {
                lastError = parseResult.error || 'Failed to parse JSON response';
                this.logger.warn(`JSON parse failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            const validationResult = validateQuizResponse(parseResult.data);

            if (!validationResult.success) {
                lastError = validationResult.errors?.message || 'Schema validation failed';
                this.logger.warn(`Validation failed on attempt ${retry + 1}: ${lastError}`);
                continue;
            }

            this.logger.debug(`Quiz generated from segments successfully after ${totalAttempts} attempt(s)`);

            return {
                success: true,
                data: validationResult.data as QuizResponse,
                retryCount: totalAttempts,
            };
        }

        this.logger.error(`Quiz generation from segments failed after ${totalAttempts} attempts: ${lastError}`);

        return {
            success: false,
            error: `Failed to generate quiz after ${totalAttempts} attempts: ${lastError}`,
            retryCount: totalAttempts,
        };
    }
}

