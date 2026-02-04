// Sentry instrumentation - must be imported before any other modules
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [nodeProfilingIntegration()],

    // Filter out non-error events
    beforeSend(event) {
      // Don't send expected errors (404s, validation errors, etc.)
      if (event.exception?.values?.[0]?.type === 'NotFoundException') {
        return null;
      }
      if (event.exception?.values?.[0]?.type === 'BadRequestException') {
        return null;
      }
      if (event.exception?.values?.[0]?.type === 'UnauthorizedException') {
        return null;
      }

      return event;
    },
  });

  console.log('[Sentry] Initialized with DSN');
} else {
  console.log('[Sentry] DSN not configured, error tracking disabled');
}

export { Sentry };
