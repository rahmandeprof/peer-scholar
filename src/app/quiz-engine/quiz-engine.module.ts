/**
 * Quiz Engine Module - NestJS module for quiz and flashcard generation
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FlashcardGenerator, QuizGenerator } from './generators';
import { LLMService, PromptBuilderService } from './services';

@Module({
  imports: [ConfigModule],
  providers: [
    LLMService,
    PromptBuilderService,
    QuizGenerator,
    FlashcardGenerator,
  ],
  exports: [
    LLMService,
    PromptBuilderService,
    QuizGenerator,
    FlashcardGenerator,
  ],
})
export class QuizEngineModule {}
