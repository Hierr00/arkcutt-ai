/**
 * Next.js Instrumentation File
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Disable Sentry in development
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import Sentry server config
    await import('./sentry.server.config');
  }

  // Only run on edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import Sentry edge config
    await import('./sentry.edge.config');
  }
}

/**
 * Hook to capture errors from nested React Server Components
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errors-from-nested-react-server-components
 */
export const onRequestError = process.env.NODE_ENV === 'development'
  ? () => {}
  : Sentry.captureRequestError;
