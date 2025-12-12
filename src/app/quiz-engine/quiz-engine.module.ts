/**
 * Quiz Engine Module - NestJS module for quiz and flashcard generation
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LLMService, PromptBuilderService } from './services';
import { QuizGenerator, FlashcardGenerator } from './generators';

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
export class QuizEngineModule { }
