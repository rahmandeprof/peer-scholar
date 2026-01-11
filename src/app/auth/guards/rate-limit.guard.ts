import { Injectable, ExecutionContext } from '@nestjs/common';
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
      throw new Error('Daily quiz limit reached. Try again tomorrow.');
    } else if (path.includes('/materials') && request.method === 'POST') {
      throw new Error('Hourly upload limit reached. Try again later.');
    }

    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
