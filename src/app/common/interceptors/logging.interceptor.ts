import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;

          this.logger.log(
            `${String(method)} ${String(url)} ${String(response.statusCode)} - ${String(delay)}ms`,
          );
        },
        error: (error) => {
          const delay = Date.now() - now;

          this.logger.error(
            `${String(method)} ${String(url)} ${String(error.status ?? 500)} - ${String(delay)}ms`,
          );
        },
      }),
    );
  }
}
