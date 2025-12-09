import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    throttlerLimitDetail: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tracker = throttlerLimitDetail.tracker;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const key = throttlerLimitDetail.key;

    // Determine the type of limit based on the throttler name or context
    // Since we can't easily get the throttler name directly in all versions,
    // we can infer from the limit or check metadata if needed.
    // However, a simpler approach for this specific requirement is to check the limit configuration
    // or just return a generic message if we can't distinguish.

    // But wait, we can define named throttlers in AppModule.
    // The throttlerLimitDetail might contain the name in newer versions.

    // Let's try to customize based on the limit value as a heuristic,
    // or better, just throw a specific message if we know which endpoint it is.
    // But this method is global/generic.

    // Actually, we can check the request path.
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
