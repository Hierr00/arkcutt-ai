/**
 * Sentry Server Configuration
 * Captures errors that occur on the server (API routes, SSR, etc.)
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

  // Capture more detailed logs in production
  integrations: [
    Sentry.httpIntegration(),
  ],

  // Ignore common errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'AbortError',
  ],

  beforeSend(event, hint) {
    // Don't send events in development (unless you want to test)
    if (process.env.NODE_ENV !== 'production' && !process.env.SENTRY_TEST_MODE) {
      return null;
    }

    // Scrub sensitive data
    if (event.request) {
      // Remove authorization headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Remove sensitive query params
      if (event.request.query_string && typeof event.request.query_string === 'string') {
        const sanitized = event.request.query_string
          .replace(/api_key=[^&]*/gi, 'api_key=[REDACTED]')
          .replace(/token=[^&]*/gi, 'token=[REDACTED]');
        event.request.query_string = sanitized;
      }
    }

    return event;
  },
});
