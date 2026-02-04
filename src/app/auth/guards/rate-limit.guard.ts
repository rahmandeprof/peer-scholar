import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    // Check the request path to provide specific error messages
    const request = context.switchToHttp().getRequest();
    const path = request.path;

    if (path.includes('/chat/quiz')) {
      throw new HttpException(
        'Daily quiz limit reached. Try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } else if (path.includes('/materials') && request.method === 'POST') {
      throw new HttpException(
        'Hourly upload limit reached. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
