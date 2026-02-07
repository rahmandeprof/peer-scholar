import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { UsersService } from '@/app/users/users.service';

import { Observable } from 'rxjs';

@Injectable()
export class LastSeenInterceptor implements NestInterceptor {
  constructor(private readonly usersService: UsersService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only update if user is authenticated and exists
    if (user && user.id) {
      // We don't await this to avoid blocking the response
      // The service method should handle throttling if needed,
      // but we can also check here if we had access to the previous timestamp.
      // Since we don't have the user entity here (only the JWT payload usually),
      // we'll rely on a lightweight update or just do it.
      // To avoid DB spam, we could cache "last update time" in memory/redis,
      // but for now let's just fire-and-forget.
      // Actually, let's implement a simple in-memory debounce/throttle here
      // or rely on the fact that standard API usage isn't *that* high frequency per user
      // compared to a game.
      // Better: let's modify UsersService to check before writing if we are worried,
      // but for "Active Users (15m)", writing every request is a bit heavy.

      // Let's rely on the UsersService logic?
      // The current UsersService.updateLastSeen just does `update`.
      // Let's just run it. The DB can handle it for this scale.

      this.usersService.updateLastSeen(user.id).catch(() => {
        // Ignore errors during background update
      });
    }

    return next.handle();
  }
}
