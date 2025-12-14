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
  'content',       // Document content
  'password',      // User passwords
  'token',         // Auth tokens
  'access_token',  // JWT tokens
  'refreshToken',  // Refresh tokens
  'verificationToken', // Email verification
  'text',          // Segment text (can be large)
];

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {
    this.logger.setContext(RequestLoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      // Do something that is only important in the context of regular HTTP requests (REST)
      const req = context.switchToHttp().getRequest();

      return this.handleHTTPRequest(req, next);
    }

    return next.handle();
  }

  handleHTTPRequest(req: Request, next: CallHandler): Observable<unknown> {
    const now = Date.now();

    const { method, url, body, ip, query } = req;

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

          this.logger.log(
            `HTTP response ${requestHash} +${duration.toString()}ms`,
            typeof responseBody === 'object' && responseBody !== null
              ? this.sanitizeForLogging(responseBody)
              : responseBody,
          );
          this.logger.log(
            `========= [END] HTTP request ${requestHash} =========`,
          );
        },
      }),
    );
  }

  /**
   * Recursively sanitize object by redacting sensitive fields
   */
  private sanitizeForLogging(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForLogging(item));
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        // Redact sensitive field - show length hint for debugging
        const length = typeof value === 'string' ? value.length :
          Array.isArray(value) ? value.length : 0;
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
