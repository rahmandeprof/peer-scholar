/**
 * Quiz Generator - Generates quizzes using LLM with validation and retry
 */
import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../services/llm.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
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
        let bestAttemptQuestions: QuizResponse['questions'] = [];
        let bestAttemptData: QuizResponse | null = null;

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

            // Filter out questions with < 2 options (hybrid filtering)
            const allQuestions = parseResult.data.questions || [];
            const validQuestions = allQuestions.filter(q =>
                Array.isArray(q.options) &&
                q.options.length >= 2 &&
                q.question?.length >= 10 &&
                q.answer?.length >= 1 &&
                q.explanation?.length >= 10
            );

            const invalidCount = allQuestions.length - validQuestions.length;
            if (invalidCount > 0) {
                this.logger.warn(`Filtered out ${invalidCount} invalid questions (< 2 options or missing fields)`);
            }

            // Track best attempt
            if (validQuestions.length > bestAttemptQuestions.length) {
                bestAttemptQuestions = validQuestions;
                bestAttemptData = parseResult.data;
            }

            // Check if we have enough valid questions (at least 50% or minimum 3)
            const minRequired = Math.max(3, Math.floor(questionCount * 0.5));
            if (validQuestions.length >= minRequired || validQuestions.length >= questionCount) {
                // Success with filtered questions
                this.logger.debug(`Quiz generated successfully after ${totalAttempts} attempt(s) with ${validQuestions.length} valid questions`);

                return {
                    success: true,
                    data: {
                        ...parseResult.data,
                        questions: validQuestions,
                    } as QuizResponse,
                    retryCount: totalAttempts,
                };
            }

            // Not enough valid questions, retry
            lastError = `Only ${validQuestions.length} valid questions (need ${minRequired})`;
            this.logger.warn(`Insufficient valid questions on attempt ${retry + 1}: ${lastError}`);
        }

        // All retries exhausted - return best attempt if we have any valid questions
        if (bestAttemptQuestions.length > 0 && bestAttemptData) {
            this.logger.warn(`Returning best attempt with ${bestAttemptQuestions.length} valid questions after ${totalAttempts} retries`);
            return {
                success: true,
                data: {
                    ...bestAttemptData,
                    questions: bestAttemptQuestions,
                } as QuizResponse,
                retryCount: totalAttempts,
            };
        }

        // Complete failure - no valid questions at all
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
        let bestAttemptQuestions: QuizResponse['questions'] = [];
        let bestAttemptData: QuizResponse | null = null;

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

            // Filter out questions with < 2 options (hybrid filtering)
            const allQuestions = parseResult.data.questions || [];
            const validQuestions = allQuestions.filter(q =>
                Array.isArray(q.options) &&
                q.options.length >= 2 &&
                q.question?.length >= 10 &&
                q.answer?.length >= 1 &&
                q.explanation?.length >= 10
            );

            const invalidCount = allQuestions.length - validQuestions.length;
            if (invalidCount > 0) {
                this.logger.warn(`Filtered out ${invalidCount} invalid questions (< 2 options or missing fields)`);
            }

            // Track best attempt
            if (validQuestions.length > bestAttemptQuestions.length) {
                bestAttemptQuestions = validQuestions;
                bestAttemptData = parseResult.data;
            }

            // Check if we have enough valid questions (at least 50% or minimum 3)
            const minRequired = Math.max(3, Math.floor(adjustedQuestionCount * 0.5));
            if (validQuestions.length >= minRequired || validQuestions.length >= adjustedQuestionCount) {
                this.logger.debug(`Quiz generated from segments successfully after ${totalAttempts} attempt(s) with ${validQuestions.length} valid questions`);

                return {
                    success: true,
                    data: {
                        ...parseResult.data,
                        questions: validQuestions,
                    } as QuizResponse,
                    retryCount: totalAttempts,
                };
            }

            // Not enough valid questions, retry
            lastError = `Only ${validQuestions.length} valid questions (need ${minRequired})`;
            this.logger.warn(`Insufficient valid questions on attempt ${retry + 1}: ${lastError}`);
        }

        // All retries exhausted - return best attempt if we have any valid questions
        if (bestAttemptQuestions.length > 0 && bestAttemptData) {
            this.logger.warn(`Returning best attempt with ${bestAttemptQuestions.length} valid questions after ${totalAttempts} retries`);
            return {
                success: true,
                data: {
                    ...bestAttemptData,
                    questions: bestAttemptQuestions,
                } as QuizResponse,
                retryCount: totalAttempts,
            };
        }

        // Complete failure - no valid questions at all
        this.logger.error(`Quiz generation from segments failed after ${totalAttempts} attempts: ${lastError}`);

        return {
            success: false,
            error: `Failed to generate quiz after ${totalAttempts} attempts: ${lastError}`,
            retryCount: totalAttempts,
        };
    }
}

