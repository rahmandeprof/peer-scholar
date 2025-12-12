/**
 * LLM Service - Retry-safe OpenAI wrapper with exponential backoff
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface LLMRequest {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LLMResponse {
    success: boolean;
    content?: string;
    error?: string;
    attempts?: number;
}

@Injectable()
export class LLMService {
    private readonly logger = new Logger(LLMService.name);
    private openai: OpenAI | null = null;
    private readonly defaultModel: string;
    private readonly maxRetries = 3;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
        this.defaultModel = this.configService.get<string>('OPENAI_GENERATION_MODEL') || 'gpt-4o-mini';
    }

    /**
     * Call the LLM with retry logic and exponential backoff
     */
    async call(request: LLMRequest): Promise<LLMResponse> {
        if (!this.openai) {
            return { success: false, error: 'OpenAI client not configured' };
        }

        const model = request.model || this.defaultModel;
        let lastError: string = '';

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.debug(`LLM call attempt ${attempt}/${this.maxRetries}`);

                const response = await this.openai.chat.completions.create({
                    model,
                    messages: [
                        { role: 'system', content: request.systemPrompt },
                        { role: 'user', content: request.userPrompt },
                    ],
                    temperature: request.temperature ?? 0.7,
                    max_tokens: request.maxTokens ?? 2000,
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0]?.message?.content;

                if (!content) {
                    lastError = 'Empty response from LLM';
                    continue;
                }

                return { success: true, content, attempts: attempt };
            } catch (error) {
                lastError = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(`LLM call attempt ${attempt} failed: ${lastError}`);

                if (attempt < this.maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const backoffMs = Math.pow(2, attempt - 1) * 1000;
                    await this.sleep(backoffMs);
                }
            }
        }

        this.logger.error(`LLM call failed after ${this.maxRetries} attempts: ${lastError}`);
        return { success: false, error: lastError, attempts: this.maxRetries };
    }

    /**
     * Parse JSON from LLM response with error handling
     */
    parseJSON<T>(content: string): { success: boolean; data?: T; error?: string } {
        try {
            // Clean common JSON issues
            let cleaned = content.trim();

            // Remove markdown code blocks if present
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.slice(7);
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.slice(3);
            }
            if (cleaned.endsWith('```')) {
                cleaned = cleaned.slice(0, -3);
            }

            cleaned = cleaned.trim();

            const data = JSON.parse(cleaned) as T;
            return { success: true, data };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'JSON parse error';
            return { success: false, error: message };
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
