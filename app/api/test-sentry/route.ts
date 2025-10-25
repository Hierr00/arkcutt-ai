/**
 * Test endpoint for Sentry
 * Visit: /api/test-sentry
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  // Only allow in development or with special header
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Endpoint disabled in production. Use Sentry dashboard to test.'
    }, { status: 403 });
  }

  try {
    // Test 1: Capture a message
    Sentry.captureMessage('Test message from API route', 'info');

    // Test 2: Capture an error
    const testError = new Error('Test error from API route');
    Sentry.captureException(testError, {
      tags: {
        test: 'sentry-test',
      },
      extra: {
        endpoint: '/api/test-sentry',
        timestamp: new Date().toISOString(),
      },
    });

    // Test 3: Add breadcrumb
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'Test breadcrumb added',
      level: 'info',
    });

    return NextResponse.json({
      success: true,
      message: 'Sentry test events sent!',
      instructions: [
        'Check your Sentry dashboard at https://sentry.io',
        'Events may take 10-30 seconds to appear',
        'You should see 1 message and 1 error',
      ],
    });
  } catch (error: any) {
    Sentry.captureException(error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
