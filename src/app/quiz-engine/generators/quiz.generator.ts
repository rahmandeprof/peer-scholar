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
  ) {}

  /**
   * Generate a quiz based on the request parameters
   */
  async generate(
    request: QuizGenerationRequest,
  ): Promise<QuizGenerationResult> {
    const {
      topic,
      difficulty = QuizDifficulty.INTERMEDIATE,
      questionCount = 5,
      textSegment,
    } = request;

    if (!topic || topic.trim().length === 0) {
      return { success: false, error: 'Topic is required for quiz generation' };
    }

    this.logger.debug(
      `Generating quiz: topic="${topic}", difficulty=${difficulty}, count=${questionCount}`,
    );

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
      const parseResult = this.llmService.parseJSON<QuizResponse>(
        llmResponse.content,
      );

      if (!parseResult.success || !parseResult.data) {
        lastError = parseResult.error || 'Failed to parse JSON response';
        this.logger.warn(
          `JSON parse failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      // Handle potential object wrappers - LLM might return nested objects
      let quizData = parseResult.data;

      if (!quizData.questions && typeof quizData === 'object') {
        this.logger.debug(
          `Quiz response missing questions array. Keys: ${Object.keys(quizData as object).join(', ')}`,
        );

        // Try to find questions array in nested objects
        for (const [key, value] of Object.entries(quizData as object)) {
          if (
            typeof value === 'object' &&
            value !== null &&
            'questions' in value
          ) {
            this.logger.debug(`Unwrapped quiz data from nested key: ${key}`);
            quizData = value as QuizResponse;
            break;
          }
          // Also check for direct questions array in nested object
          if (Array.isArray(value) && value.length > 0 && value[0]?.question) {
            this.logger.debug(`Found questions array directly in key: ${key}`);
            quizData = { questions: value } as QuizResponse;
            break;
          }
        }

        if (!quizData.questions) {
          this.logger.warn(
            `Could not find questions in response. Structure: ${JSON.stringify(quizData).substring(0, 500)}`,
          );
        }
      }

      // REPAIR incomplete questions instead of discarding them
      const allQuestions = quizData.questions || [];
      const repairedQuestions = allQuestions
        .map((q) => this.repairQuestion(q))
        .filter((q) => q !== null);

      const repairedCount = allQuestions.length - repairedQuestions.length;

      if (repairedCount > 0) {
        this.logger.warn(
          `Could not repair ${repairedCount} questions (missing critical fields)`,
        );
      }

      // Track best attempt
      if (repairedQuestions.length > bestAttemptQuestions.length) {
        bestAttemptQuestions = repairedQuestions;
        bestAttemptData = quizData;
      }

      // Check if we have enough questions (relaxed: at least 2 or 30% of requested)
      const minRequired = Math.max(2, Math.floor(questionCount * 0.3));

      if (
        repairedQuestions.length >= minRequired ||
        repairedQuestions.length >= questionCount
      ) {
        // Success with repaired questions
        this.logger.debug(
          `Quiz generated successfully after ${totalAttempts} attempt(s) with ${repairedQuestions.length} questions`,
        );

        return {
          success: true,
          data: {
            ...quizData,
            questions: repairedQuestions,
          } as QuizResponse,
          retryCount: totalAttempts,
        };
      }

      // Not enough questions, retry
      lastError = `Only ${repairedQuestions.length} questions (need ${minRequired})`;
      this.logger.warn(
        `Insufficient questions on attempt ${retry + 1}: ${lastError}`,
      );
    }

    // All retries exhausted - return best attempt if we have any valid questions
    if (bestAttemptQuestions.length > 0 && bestAttemptData) {
      this.logger.warn(
        `Returning best attempt with ${bestAttemptQuestions.length} valid questions after ${totalAttempts} retries`,
      );

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
    this.logger.error(
      `Quiz generation failed after ${totalAttempts} attempts: ${lastError}`,
    );

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
    questionCount = 5,
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
    segments: {
      text: string;
      pageStart?: number;
      pageEnd?: number;
      heading?: string;
    }[],
    topic: string,
    difficulty: QuizDifficulty = QuizDifficulty.INTERMEDIATE,
    questionCount = 5,
  ): Promise<QuizGenerationResult> {
    if (!segments || segments.length === 0) {
      return {
        success: false,
        error: 'No segments provided for quiz generation',
      };
    }

    if (!topic || topic.trim().length === 0) {
      return { success: false, error: 'Topic is required for quiz generation' };
    }

    // Calculate total tokens from segments (rough estimate: 4 chars = 1 token)
    const totalChars = segments.reduce(
      (sum, seg) => sum + (seg.text?.length || 0),
      0,
    );
    const estimatedTokens = Math.ceil(totalChars / 4);

    // Scale question count based on content size (minimum 50 tokens per question)
    const TOKENS_PER_QUESTION = 50;
    const maxQuestionsForContent = Math.max(
      1,
      Math.floor(estimatedTokens / TOKENS_PER_QUESTION),
    );
    const adjustedQuestionCount = Math.min(
      questionCount,
      maxQuestionsForContent,
    );

    if (adjustedQuestionCount < questionCount) {
      this.logger.warn(
        `Content too short for ${questionCount} questions (${estimatedTokens} tokens). ` +
          `Scaling down to ${adjustedQuestionCount} question(s).`,
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
    const { systemPrompt, userPrompt } =
      this.promptBuilder.buildQuizPromptsFromSegments(
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

      const parseResult = this.llmService.parseJSON<QuizResponse>(
        llmResponse.content,
      );

      if (!parseResult.success || !parseResult.data) {
        lastError = parseResult.error || 'Failed to parse JSON response';
        this.logger.warn(
          `JSON parse failed on attempt ${retry + 1}: ${lastError}`,
        );
        continue;
      }

      // Handle potential object wrappers - LLM might return nested objects
      let quizData = parseResult.data;

      if (!quizData.questions && typeof quizData === 'object') {
        this.logger.debug(
          `Quiz response missing questions array. Keys: ${Object.keys(quizData as object).join(', ')}`,
        );

        // Try to find questions array in nested objects
        for (const [key, value] of Object.entries(quizData as object)) {
          if (
            typeof value === 'object' &&
            value !== null &&
            'questions' in value
          ) {
            this.logger.debug(`Unwrapped quiz data from nested key: ${key}`);
            quizData = value as QuizResponse;
            break;
          }
          // Also check for direct questions array in nested object
          if (Array.isArray(value) && value.length > 0 && value[0]?.question) {
            this.logger.debug(`Found questions array directly in key: ${key}`);
            quizData = { questions: value } as QuizResponse;
            break;
          }
        }

        if (!quizData.questions) {
          this.logger.warn(
            `Could not find questions in response. Structure: ${JSON.stringify(quizData).substring(0, 500)}`,
          );
        }
      }

      // REPAIR incomplete questions instead of discarding them
      const allQuestions = quizData.questions || [];
      const repairedQuestions = allQuestions
        .map((q) => this.repairQuestion(q))
        .filter((q) => q !== null);

      const repairedCount = allQuestions.length - repairedQuestions.length;

      if (repairedCount > 0) {
        this.logger.warn(
          `Could not repair ${repairedCount} questions (missing critical fields)`,
        );
      }

      // Track best attempt
      if (repairedQuestions.length > bestAttemptQuestions.length) {
        bestAttemptQuestions = repairedQuestions;
        bestAttemptData = quizData;
      }

      // Check if we have enough questions (relaxed: at least 2 or 30% of requested)
      const minRequired = Math.max(2, Math.floor(adjustedQuestionCount * 0.3));

      if (
        repairedQuestions.length >= minRequired ||
        repairedQuestions.length >= adjustedQuestionCount
      ) {
        this.logger.debug(
          `Quiz generated from segments successfully after ${totalAttempts} attempt(s) with ${repairedQuestions.length} questions`,
        );

        return {
          success: true,
          data: {
            ...quizData,
            questions: repairedQuestions,
          } as QuizResponse,
          retryCount: totalAttempts,
        };
      }

      // Not enough questions, retry
      lastError = `Only ${repairedQuestions.length} questions (need ${minRequired})`;
      this.logger.warn(
        `Insufficient questions on attempt ${retry + 1}: ${lastError}`,
      );
    }

    // All retries exhausted - return best attempt if we have any valid questions
    if (bestAttemptQuestions.length > 0 && bestAttemptData) {
      this.logger.warn(
        `Returning best attempt with ${bestAttemptQuestions.length} valid questions after ${totalAttempts} retries`,
      );

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
    this.logger.error(
      `Quiz generation from segments failed after ${totalAttempts} attempts: ${lastError}`,
    );

    return {
      success: false,
      error: `Failed to generate quiz after ${totalAttempts} attempts: ${lastError}`,
      retryCount: totalAttempts,
    };
  }

  /**
   * Repair an incomplete question by filling in missing fields
   * Returns null only if the question is completely unsalvageable
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private repairQuestion(q: any): any | null {
    // Must have at least a question text
    if (
      !q?.question ||
      typeof q.question !== 'string' ||
      q.question.length < 5
    ) {
      return null;
    }

    // Must have an answer
    if (!q?.answer || typeof q.answer !== 'string' || q.answer.length < 1) {
      return null;
    }

    const repaired = { ...q };

    // Ensure options is an array
    if (!Array.isArray(repaired.options)) {
      repaired.options = [];
    }

    // If answer is not in options, add it
    if (!repaired.options.includes(repaired.answer)) {
      repaired.options.unshift(repaired.answer);
    }

    // Generate filler options if we have fewer than 4
    if (repaired.options.length < 4) {
      const fillers = this.generateFillerOptions(
        repaired.question,
        repaired.answer,
        repaired.options,
        4 - repaired.options.length,
      );

      repaired.options = [...repaired.options, ...fillers];
    }

    // Shuffle options so correct answer isn't always first
    repaired.options = this.shuffleArray([...repaired.options]);

    // Fix short or missing explanation
    if (!repaired.explanation || repaired.explanation.length < 5) {
      repaired.explanation = `The correct answer is: ${repaired.answer}`;
    }

    // Ensure hint exists
    if (!repaired.hint) {
      repaired.hint = 'Think carefully about the question.';
    }

    // Ensure ID exists
    if (!repaired.id) {
      repaired.id = `q${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }

    // Ensure type exists
    if (!repaired.type) {
      repaired.type = 'mcq';
    }

    return repaired;
  }

  /**
   * Generate smart filler options based on the question context
   */
  private generateFillerOptions(
    question: string,
    correctAnswer: string,
    existingOptions: string[],
    count: number,
  ): string[] {
    const fillers: string[] = [];

    // Common distractor patterns
    const genericDistractors = [
      'None of the above',
      'All of the above',
      'Cannot be determined',
      'Not applicable',
    ];

    // Try to generate contextual distractors based on answer type
    const answerLower = correctAnswer.toLowerCase();

    // If answer is a number, generate nearby numbers
    const numMatch = /^(\d+(?:\.\d+)?)/.exec(correctAnswer);

    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      const variations = [
        (num * 0.5).toFixed(numMatch[0].includes('.') ? 1 : 0),
        (num * 1.5).toFixed(numMatch[0].includes('.') ? 1 : 0),
        (num * 2).toFixed(numMatch[0].includes('.') ? 1 : 0),
        (num + 1).toString(),
        (num - 1).toString(),
      ];

      for (const v of variations) {
        if (
          v !== correctAnswer &&
          !existingOptions.includes(v) &&
          !fillers.includes(v) &&
          fillers.length < count
        ) {
          fillers.push(v);
        }
      }
    }

    // If answer is True/False, add the opposite
    if (answerLower === 'true' && !existingOptions.includes('False')) {
      fillers.push('False');
    } else if (answerLower === 'false' && !existingOptions.includes('True')) {
      fillers.push('True');
    }

    // Fill remaining with generic distractors
    for (const distractor of genericDistractors) {
      if (
        !existingOptions.includes(distractor) &&
        !fillers.includes(distractor) &&
        fillers.length < count
      ) {
        fillers.push(distractor);
      }
    }

    // If still not enough, add letter-based options
    const letters = ['Option A', 'Option B', 'Option C', 'Option D'];

    for (const letter of letters) {
      if (
        !existingOptions.includes(letter) &&
        !fillers.includes(letter) &&
        fillers.length < count
      ) {
        fillers.push(letter);
      }
    }

    return fillers.slice(0, count);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }
}
