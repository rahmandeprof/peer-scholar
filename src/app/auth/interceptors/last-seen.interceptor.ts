import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  OnModuleInit,
} from '@nestjs/common';

import { UsersService } from '@/app/users/users.service';

import { Observable } from 'rxjs';

@Injectable()
export class LastSeenInterceptor implements NestInterceptor, OnModuleInit {
  private lastSeenCache = new Map<string, number>();
  private readonly THROTTLE_MS = 60_000; // 1 minute

  constructor(private readonly usersService: UsersService) { }

  onModuleInit() {
    // Clean up stale entries every 10 minutes
    setInterval(() => {
      const cutoff = Date.now() - this.THROTTLE_MS;
      for (const [key, time] of this.lastSeenCache) {
        if (time < cutoff) this.lastSeenCache.delete(key);
      }
    }, 10 * 60_000);
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.id) {
      const now = Date.now();
      const lastUpdate = this.lastSeenCache.get(user.id) ?? 0;

      if (now - lastUpdate > this.THROTTLE_MS) {
        this.lastSeenCache.set(user.id, now);
        this.usersService.updateLastSeen(user.id).catch(() => { });
      }
    }

    return next.handle();
  }
}
