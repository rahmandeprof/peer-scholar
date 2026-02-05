import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';

import { createId } from '@paralleldrive/cuid2';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

// Fields to redact from logs for security/privacy
const SENSITIVE_FIELDS = [
  // Document content
  'content',
  'text',
  'textSegment',
  'rawContent',
  'cleanedText',
  // Auth/Security
  'password',
  'token',
  'access_token',
  'refreshToken',
  'verificationToken',
  'apiKey',
  // Quiz/Flashcard content (academic material)
  'question',
  'answer',
  'explanation',
  'hint',
  'options',
  'front',
  'back',
  'term',
  'definition',
  // File data
  'buffer',
  'file',
  'fileData',
];

// Max array items to show before summarizing
const MAX_ARRAY_ITEMS_TO_LOG = 3;

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly logger: WinstonLoggerService) {
    this.logger.setContext(RequestLoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Skip request logging entirely in production to reduce log noise
    if (this.isProduction) {
      return next.handle();
    }

    if (context.getType() === 'http') {
      // Do something that is only important in the context of regular HTTP requests (REST)
      const req = context.switchToHttp().getRequest();

      return this.handleHTTPRequest(req, next);
    }

    return next.handle();
  }

  handleHTTPRequest(req: Request, next: CallHandler): Observable<unknown> {
    const now = Date.now();

    const { method, url, ip, query } = req;
    const body = req.body;

    const requestHash = createId();

    this.logger.log(`========= [START] HTTP request ${requestHash} =========`);
    this.logger.log(`HTTP request ${requestHash}`, {
      method,
      url,
      body: this.sanitizeForLogging(body),
      ip,
      query,
    });

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const duration = Date.now() - now;

          // Summarize response for logging (avoid bloating logs)
          const logSafeResponse = this.summarizeResponse(responseBody, url);

          this.logger.log(
            `HTTP response ${requestHash} +${duration.toString()}ms`,
            logSafeResponse,
          );
          this.logger.log(
            `========= [END] HTTP request ${requestHash} =========`,
          );
        },
      }),
    );
  }

  /**
   * Summarize response body for logging - prevents log bloat
   */
  private summarizeResponse(responseBody: unknown, url: string): unknown {
    // For quiz/flashcard endpoints, just log summary
    if (url.includes('/chat/quiz/') || url.includes('/chat/flashcards/')) {
      if (Array.isArray(responseBody)) {
        return {
          _summary: `Generated ${responseBody.length} items`,
          type: 'quiz/flashcard',
        };
      }
      if (typeof responseBody === 'object' && responseBody !== null) {
        const obj = responseBody as Record<string, unknown>;

        if (obj.status === 'upgrading') {
          return { status: 'upgrading', materialId: obj.materialId };
        }
      }
    }

    // For material content endpoints, summarize
    if (
      url.includes('/materials/') &&
      typeof responseBody === 'object' &&
      responseBody !== null
    ) {
      return this.sanitizeForLogging(responseBody);
    }

    // For arrays, limit what we log
    if (Array.isArray(responseBody)) {
      if (responseBody.length > MAX_ARRAY_ITEMS_TO_LOG) {
        return {
          _summary: `Array with ${responseBody.length} items`,
          _preview: responseBody
            .slice(0, MAX_ARRAY_ITEMS_TO_LOG)
            .map((item) => this.sanitizeForLogging(item)),
        };
      }

      return responseBody.map((item) => this.sanitizeForLogging(item));
    }

    if (typeof responseBody === 'object' && responseBody !== null) {
      return this.sanitizeForLogging(responseBody);
    }

    return responseBody;
  }

  /**
   * Recursively sanitize object by redacting sensitive fields
   */
  private sanitizeForLogging(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Limit array logging to prevent bloat
      if (obj.length > MAX_ARRAY_ITEMS_TO_LOG) {
        return {
          _summary: `Array[${obj.length}]`,
          _preview: obj
            .slice(0, 2)
            .map((item) => this.sanitizeForLogging(item)),
        };
      }

      return obj.map((item) => this.sanitizeForLogging(item));
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        // Redact sensitive field - show length hint for debugging
        const length =
          typeof value === 'string'
            ? value.length
            : Array.isArray(value)
              ? value.length
              : 0;

        sanitized[key] = `[REDACTED:${length}]`;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
