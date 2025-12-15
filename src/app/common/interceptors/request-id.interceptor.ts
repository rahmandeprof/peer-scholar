import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

/**
 * Adds a unique request ID to every request for tracing and debugging.
 * 
 * - Adds `X-Request-ID` header to response
 * - Attaches request ID to request object for logging
 * - Respects incoming `X-Request-ID` header if provided (for distributed tracing)
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        // Use existing request ID if provided (distributed tracing), otherwise generate new
        const requestId = (request.headers['x-request-id'] as string) || uuidv4();

        // Attach to request for use in logging
        (request as Request & { requestId: string }).requestId = requestId;

        // Add to response headers
        response.setHeader('X-Request-ID', requestId);

        return next.handle();
    }
}
