/**
 * Prompt Builder Service - Constructs system and user prompts for quiz/flashcard generation
 */
import { Injectable } from '@nestjs/common';
import { QuizDifficulty } from '../types';

export type GenerationType = 'quiz' | 'flashcards';

export interface PromptConfig {
    type: GenerationType;
    topic: string;
    difficulty?: QuizDifficulty;
    itemCount?: number;
    textSegment?: string;
}

@Injectable()
export class PromptBuilderService {
    /**
     * The permanent system prompt for PeerToLearn quiz/flashcard generation
     */
    getSystemPrompt(): string {
        return `You generate quizzes and flashcards for PeerToLearn based on topics or text segments.
Always follow the agreed structure strictly.

**Quiz Behavior**
- Vary phrasing and reasoning with each generation to avoid repetition.
- Match difficulty levels:
  - Beginner = factual recall, definitions, simple identification
  - Intermediate = application, comparison, cause-effect relationships
  - Advanced = multi-step reasoning, analysis, scenario-based problem solving
- Support question types: MCQ, fill-in-the-blank, short response, true/false, scenario-based.
- Always provide hints, answers, and explanations.
- Generate unique IDs for each question (use format: q1, q2, q3, etc.)

**Flashcard Behavior**
- Output clear front/back pairs.
- Prioritize core definitions, key ideas, and spaced-repetition-friendly content.
- Keep fronts as questions or term names, backs as concise answers.
- Generate unique IDs for each card (use format: f1, f2, f3, etc.)

**JSON Output Format for Quiz:**
{
  "topic": "<topic name>",
  "difficulty": "<beginner|intermediate|advanced>",
  "questions": [
    {
      "id": "q1",
      "type": "<mcq|fill_blank|short_response|true_false|scenario>",
      "question": "<the question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "answer": "<correct answer>",
      "explanation": "<why this is correct>",
      "hint": "<optional hint>"
    }
  ]
}

**JSON Output Format for Flashcards:**
[
  {
    "id": "f1",
    "front": "<front of card - question or term>",
    "back": "<back of card - answer or definition>"
  }
]

IMPORTANT: Respond with ONLY valid JSON. No markdown, no explanations, just the JSON object/array.`;
    }

    /**
     * Build a user prompt for the specified generation type
     */
    buildUserPrompt(config: PromptConfig): string {
        const { type, topic, difficulty, itemCount, textSegment } = config;

        const typeLabel = type === 'quiz' ? 'quiz questions' : 'flashcards';
        const count = itemCount || (type === 'quiz' ? 5 : 10);
        const difficultyLabel = difficulty || 'intermediate';

        let prompt = `Generate ${count} ${typeLabel} based on the following context:

Topic: "${topic}"`;

        if (type === 'quiz') {
            prompt += `
Difficulty: ${difficultyLabel}`;
        }

        if (textSegment && textSegment.trim().length > 0) {
            // Limit segment length to avoid token issues
            const segment = textSegment.length > 8000
                ? textSegment.substring(0, 8000) + '...'
                : textSegment;

            prompt += `

Text Content (use this as the primary source for questions):
"""
${segment}
"""`;
        }

        prompt += `

Ensure the output is dynamic, educational, and follows the required JSON format strictly.
${type === 'quiz'
                ? 'Include a diverse mix of question types (MCQ, true/false, fill-in-the-blank, etc.).'
                : 'Focus on the most important concepts that would be useful for spaced repetition study.'}

Respond with ONLY valid JSON.`;

        return prompt;
    }

    /**
     * Build prompts for quiz generation
     */
    buildQuizPrompts(
        topic: string,
        difficulty: QuizDifficulty = QuizDifficulty.INTERMEDIATE,
        questionCount: number = 5,
        textSegment?: string,
    ): { systemPrompt: string; userPrompt: string } {
        return {
            systemPrompt: this.getSystemPrompt(),
            userPrompt: this.buildUserPrompt({
                type: 'quiz',
                topic,
                difficulty,
                itemCount: questionCount,
                textSegment,
            }),
        };
    }

    /**
     * Build prompts for flashcard generation
     */
    buildFlashcardPrompts(
        topic: string,
        cardCount: number = 10,
        textSegment?: string,
    ): { systemPrompt: string; userPrompt: string } {
        return {
            systemPrompt: this.getSystemPrompt(),
            userPrompt: this.buildUserPrompt({
                type: 'flashcards',
                topic,
                itemCount: cardCount,
                textSegment,
            }),
        };
    }
}
