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
  ) {}

  /**
   * Generate flashcards based on the request parameters
   */
  async generate(
    request: FlashcardGenerationRequest,
  ): Promise<FlashcardGenerationResult> {
    const { topic, cardCount = 10, textSegment } = request;

    if (!topic || topic.trim().length === 0) {
      return {
        success: false,
        error: 'Topic is required for flashcard generation',
      };
    }

    this.logger.debug(
      `Generating flashcards: topic="${topic}", count=${cardCount}`,
    );

    // Build prompts
    const { systemPrompt, userPrompt } =
      this.promptBuilder.buildFlashcardPrompts(topic, cardCount, textSegment);

    let lastError = '';
    let totalAttempts = 0;

    // Retry loop for validation failures
    for (let retry = 0; retry < this.maxValidationRetries; retry++) {
      // Call LLM
      const llmResponse = await this.llmService.call({
        systemPrompt,
        userPrompt,
        temperature: 0.7 + retry * 0.1, // Slightly increase temperature on retries
      });

      totalAttempts++;

      if (!llmResponse.success || !llmResponse.content) {
        lastError = llmResponse.error || 'Failed to get LLM response';
        this.logger.warn(
          `LLM call failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      // Parse JSON
      const parseResult = this.llmService.parseJSON<
        Flashcard[] | Record<string, unknown>
      >(llmResponse.content);

      if (!parseResult.success || !parseResult.data) {
        lastError = parseResult.error || 'Failed to parse JSON response';
        this.logger.warn(
          `JSON parse failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      // Unwrap if LLM returned object wrapper like { flashcards: [...] }
      let flashcardData = parseResult.data;

      if (!Array.isArray(flashcardData) && typeof flashcardData === 'object') {
        this.logger.debug(
          `LLM returned object instead of array, attempting to unwrap. Keys: ${Object.keys(flashcardData as object).join(', ')}`,
        );

        // Try to find an array property at first level
        const arrayProp = Object.values(flashcardData as object).find((v) =>
          Array.isArray(v),
        );

        if (arrayProp) {
          this.logger.debug('Unwrapped flashcard array from object wrapper');
          flashcardData = arrayProp;
        } else {
          // Try deeper nesting - look for arrays in nested objects
          for (const value of Object.values(flashcardData as object)) {
            if (
              typeof value === 'object' &&
              value !== null &&
              !Array.isArray(value)
            ) {
              const nestedArray = Object.values(value as object).find((v) =>
                Array.isArray(v),
              );

              if (nestedArray) {
                this.logger.debug(
                  'Unwrapped flashcard array from nested object wrapper',
                );
                flashcardData = nestedArray;
                break;
              }
            }
          }
        }

        // If still not an array, log the structure for debugging
        if (!Array.isArray(flashcardData)) {
          this.logger.warn(
            `Could not unwrap array from object. Structure: ${JSON.stringify(flashcardData).substring(0, 500)}`,
          );
        }
      }

      // Validate with Zod
      const validationResult = validateFlashcardResponse(flashcardData);

      if (!validationResult.success) {
        lastError =
          validationResult.errors?.message || 'Schema validation failed';
        this.logger.warn(
          `Validation failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      // Success!
      this.logger.debug(
        `Flashcards generated successfully after ${totalAttempts} attempt(s)`,
      );

      return {
        success: true,
        data: validationResult.data as Flashcard[],
        retryCount: totalAttempts,
      };
    }

    // All retries failed
    this.logger.error(
      `Flashcard generation failed after ${totalAttempts} attempts: ${lastError}`,
    );

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
    cardCount = 10,
  ): Promise<FlashcardGenerationResult> {
    return this.generate({
      topic: materialTitle,
      cardCount,
      textSegment: materialContent,
    });
  }

  /**
   * Generate flashcards from document segments (preferred method)
   * This ensures AI only uses provided segment content
   */
  async generateFromSegments(
    segments: {
      text: string;
      pageStart?: number;
      pageEnd?: number;
      heading?: string;
    }[],
    topic: string,
    cardCount = 10,
  ): Promise<FlashcardGenerationResult> {
    if (!segments || segments.length === 0) {
      return {
        success: false,
        error: 'No segments provided for flashcard generation',
      };
    }

    if (!topic || topic.trim().length === 0) {
      return {
        success: false,
        error: 'Topic is required for flashcard generation',
      };
    }

    this.logger.debug(
      `Generating flashcards from ${segments.length} segments: topic="${topic}", count=${cardCount}`,
    );

    // Build segment-aware prompts
    const { systemPrompt, userPrompt } =
      this.promptBuilder.buildFlashcardPromptsFromSegments(
        segments,
        topic,
        cardCount,
      );

    let lastError = '';
    let totalAttempts = 0;

    // Retry loop for validation failures
    for (let retry = 0; retry < this.maxValidationRetries; retry++) {
      const llmResponse = await this.llmService.call({
        systemPrompt,
        userPrompt,
        temperature: 0.7 + retry * 0.1,
      });

      totalAttempts++;

      if (!llmResponse.success || !llmResponse.content) {
        lastError = llmResponse.error || 'Failed to get LLM response';
        this.logger.warn(
          `LLM call failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      const parseResult = this.llmService.parseJSON<
        Flashcard[] | Record<string, unknown>
      >(llmResponse.content);

      if (!parseResult.success || !parseResult.data) {
        lastError = parseResult.error || 'Failed to parse JSON response';
        this.logger.warn(
          `JSON parse failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      // Unwrap if LLM returned object wrapper like { flashcards: [...] }
      let flashcardData = parseResult.data;

      if (!Array.isArray(flashcardData) && typeof flashcardData === 'object') {
        this.logger.debug(
          `LLM returned object instead of array, attempting to unwrap. Keys: ${Object.keys(flashcardData as object).join(', ')}`,
        );

        // Try to find an array property at first level
        const arrayProp = Object.values(flashcardData as object).find((v) =>
          Array.isArray(v),
        );

        if (arrayProp) {
          this.logger.debug('Unwrapped flashcard array from object wrapper');
          flashcardData = arrayProp;
        } else {
          // Try deeper nesting - look for arrays in nested objects
          for (const value of Object.values(flashcardData as object)) {
            if (
              typeof value === 'object' &&
              value !== null &&
              !Array.isArray(value)
            ) {
              const nestedArray = Object.values(value as object).find((v) =>
                Array.isArray(v),
              );

              if (nestedArray) {
                this.logger.debug(
                  'Unwrapped flashcard array from nested object wrapper',
                );
                flashcardData = nestedArray;
                break;
              }
            }
          }
        }

        // If still not an array, log the structure for debugging
        if (!Array.isArray(flashcardData)) {
          this.logger.warn(
            `Could not unwrap array from object. Structure: ${JSON.stringify(flashcardData).substring(0, 500)}`,
          );
        }
      }

      const validationResult = validateFlashcardResponse(flashcardData);

      if (!validationResult.success) {
        lastError =
          validationResult.errors?.message || 'Schema validation failed';
        this.logger.warn(
          `Validation failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      this.logger.debug(
        `Flashcards generated from segments successfully after ${totalAttempts} attempt(s)`,
      );

      return {
        success: true,
        data: validationResult.data as Flashcard[],
        retryCount: totalAttempts,
      };
    }

    this.logger.error(
      `Flashcard generation from segments failed after ${totalAttempts} attempts: ${lastError}`,
    );

    return {
      success: false,
      error: `Failed to generate flashcards after ${totalAttempts} attempts: ${lastError}`,
      retryCount: totalAttempts,
    };
  }
}
