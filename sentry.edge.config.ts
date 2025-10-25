/**
 * Sentry Edge Configuration
 * Captures errors in Edge Runtime (middleware, edge API routes)
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: true,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  beforeSend(event, hint) {
    // Don't send events in development (unless you want to test)
    if (process.env.NODE_ENV !== 'production' && !process.env.SENTRY_TEST_MODE) {
      return null;
    }
    return event;
  },
});
