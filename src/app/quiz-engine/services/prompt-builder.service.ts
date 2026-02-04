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
- CRITICAL: Each generation MUST produce unique questions. Vary the following:
  - Question phrasing and wording (never repeat exact same question)
  - Focus areas (highlight different aspects of the content each time)
  - Question types (mix MCQ, fill-blank, true/false, scenario randomly)
  - The specific details asked about
  - Answer option orderings for MCQs
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

**Math Formatting**:
- When content contains mathematical expressions, use LaTeX syntax
- Inline math: $expression$ (e.g., $x^2$, $\\frac{a}{b}$)
- Block equations: $$expression$$
- Use proper LaTeX commands: \\frac{}{}, \\sqrt{}, \\sum, \\int, \\lim, etc.
- Apply to questions, answers, options, explanations, and flashcard content as needed

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
      const segment =
        textSegment.length > 8000
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
${
  type === 'quiz'
    ? 'Include a diverse mix of question types (MCQ, true/false, fill-in-the-blank, etc.).'
    : 'Focus on the most important concepts that would be useful for spaced repetition study.'
}

Respond with ONLY valid JSON.`;

    return prompt;
  }

  /**
   * Build prompts for quiz generation
   */
  buildQuizPrompts(
    topic: string,
    difficulty: QuizDifficulty = QuizDifficulty.INTERMEDIATE,
    questionCount = 5,
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
    cardCount = 10,
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

  /**
   * Build prompts for quiz generation from document segments
   * This explicitly restricts the AI to only use provided segment content
   */
  buildQuizPromptsFromSegments(
    segments: {
      text: string;
      pageStart?: number;
      pageEnd?: number;
      heading?: string;
    }[],
    topic: string,
    difficulty: QuizDifficulty = QuizDifficulty.INTERMEDIATE,
    questionCount = 5,
  ): { systemPrompt: string; userPrompt: string } {
    const formattedSegments = this.formatSegmentsForPrompt(segments);

    const userPrompt = `Generate ${questionCount} quiz questions based ONLY on the following document segments.

Topic: "${topic}"
Difficulty: ${difficulty}

IMPORTANT INSTRUCTIONS:
- Generate questions ONLY from the content provided below
- Do NOT use external knowledge or information not present in these segments
- Each question must be answerable from the provided text
- Reference specific concepts, terms, or facts from the segments

DOCUMENT SEGMENTS:
${formattedSegments}

Requirements:
- Include a diverse mix of question types (MCQ, true/false, fill-in-the-blank, scenario-based)
- Match the difficulty level specified
- Provide clear explanations referencing the relevant segment content
- Generate unique IDs (q1, q2, q3, etc.)

Respond with ONLY valid JSON following the quiz format.`;

    return {
      systemPrompt: this.getSystemPrompt(),
      userPrompt,
    };
  }

  /**
   * Build prompts for flashcard generation from document segments
   */
  buildFlashcardPromptsFromSegments(
    segments: {
      text: string;
      pageStart?: number;
      pageEnd?: number;
      heading?: string;
    }[],
    topic: string,
    cardCount = 10,
  ): { systemPrompt: string; userPrompt: string } {
    const formattedSegments = this.formatSegmentsForPrompt(segments);

    const userPrompt = `Generate ${cardCount} flashcards based ONLY on the following document segments.

Topic: "${topic}"

IMPORTANT INSTRUCTIONS:
- Create flashcards ONLY from the content provided below
- Do NOT use external knowledge or information not present in these segments
- Focus on key definitions, concepts, and facts from the segments
- Prioritize content suitable for spaced repetition study

DOCUMENT SEGMENTS:
${formattedSegments}

Requirements:
- Front of card should be a question, term, or concept
- Back should be a concise, accurate answer from the text
- Generate unique IDs (f1, f2, f3, etc.)
- Focus on the most important concepts for learning

Respond with ONLY valid JSON following the flashcard format.`;

    return {
      systemPrompt: this.getSystemPrompt(),
      userPrompt,
    };
  }

  /**
   * Format segments for inclusion in prompts
   */
  private formatSegmentsForPrompt(
    segments: {
      text: string;
      pageStart?: number;
      pageEnd?: number;
      heading?: string;
    }[],
  ): string {
    return segments
      .map((segment, index) => {
        let header = `[Segment ${index + 1}`;

        if (segment.pageStart !== undefined) {
          if (
            segment.pageEnd !== undefined &&
            segment.pageEnd !== segment.pageStart
          ) {
            header += ` - Pages ${segment.pageStart}-${segment.pageEnd}`;
          } else {
            header += ` - Page ${segment.pageStart}`;
          }
        }

        if (segment.heading) {
          header += ` - "${segment.heading}"`;
        }

        header += ']';

        return `${header}
"""
${segment.text}
"""`;
      })
      .join('\n\n');
  }
}
