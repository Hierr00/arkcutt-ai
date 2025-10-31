/**
 * 🔌 API: Integrations Management
 * Check status and manage integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations
 * Get status of all integrations
 */
export async function GET(request: NextRequest) {
  try {
    const integrations = [];

    // Check OpenAI API
    const openaiStatus = {
      id: 'openai',
      name: 'OpenAI',
      description: 'AI processing and analysis',
      status: process.env.OPENAI_API_KEY ? 'connected' : 'disconnected',
      icon: 'brain',
      category: 'ai',
      configured: !!process.env.OPENAI_API_KEY,
      requiredEnvVars: ['OPENAI_API_KEY'],
    };
    integrations.push(openaiStatus);

    // Check Supabase
    const supabaseStatus = {
      id: 'supabase',
      name: 'Supabase',
      description: 'Database and storage',
      status:
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? 'connected'
          : 'disconnected',
      icon: 'database',
      category: 'database',
      configured:
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      requiredEnvVars: [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
    };
    integrations.push(supabaseStatus);

    // Check Gmail API
    const gmailStatus = {
      id: 'gmail',
      name: 'Gmail API',
      description: 'Email processing and automation',
      status:
        process.env.GMAIL_CLIENT_ID &&
        process.env.GMAIL_CLIENT_SECRET &&
        process.env.GMAIL_REFRESH_TOKEN
          ? 'connected'
          : 'disconnected',
      icon: 'mail',
      category: 'communication',
      configured:
        !!process.env.GMAIL_CLIENT_ID &&
        !!process.env.GMAIL_CLIENT_SECRET &&
        !!process.env.GMAIL_REFRESH_TOKEN,
      requiredEnvVars: [
        'GMAIL_CLIENT_ID',
        'GMAIL_CLIENT_SECRET',
        'GMAIL_REDIRECT_URI',
        'GMAIL_REFRESH_TOKEN',
      ],
    };
    integrations.push(gmailStatus);

    // Check Google Places API
    const placesStatus = {
      id: 'google_places',
      name: 'Google Places API',
      description: 'Provider search and location data',
      status: process.env.GOOGLE_PLACES_API_KEY ? 'connected' : 'disconnected',
      icon: 'map-pin',
      category: 'location',
      configured: !!process.env.GOOGLE_PLACES_API_KEY,
      requiredEnvVars: ['GOOGLE_PLACES_API_KEY'],
    };
    integrations.push(placesStatus);

    // Check Sentry
    const sentryStatus = {
      id: 'sentry',
      name: 'Sentry',
      description: 'Error tracking and monitoring',
      status: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'connected' : 'disconnected',
      icon: 'shield-alert',
      category: 'monitoring',
      configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      requiredEnvVars: ['NEXT_PUBLIC_SENTRY_DSN'],
    };
    integrations.push(sentryStatus);

    // Test Supabase connection if configured
    if (supabaseStatus.configured) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { error } = await supabase.from('quotation_requests').select('id').limit(1);
        if (error) {
          supabaseStatus.status = 'error';
        }
      } catch (error) {
        supabaseStatus.status = 'error';
      }
    }

    // Calculate stats
    const connectedCount = integrations.filter(
      (i) => i.status === 'connected'
    ).length;
    const disconnectedCount = integrations.filter(
      (i) => i.status === 'disconnected'
    ).length;

    return NextResponse.json({
      success: true,
      integrations,
      stats: {
        total: integrations.length,
        connected: connectedCount,
        disconnected: disconnectedCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Test or update an integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { integrationId, action } = body;

    if (!integrationId || !action) {
      return NextResponse.json(
        { success: false, error: 'integrationId and action are required' },
        { status: 400 }
      );
    }

    // Handle test connection action
    if (action === 'test') {
      let testResult = { success: false, message: 'Unknown integration' };

      switch (integrationId) {
        case 'supabase':
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { error } = await supabase.from('quotation_requests').select('id').limit(1);
            testResult = {
              success: !error,
              message: error ? error.message : 'Connection successful',
            };
          } catch (error: any) {
            testResult = { success: false, message: error.message };
          }
          break;

        case 'openai':
          testResult = {
            success: !!process.env.OPENAI_API_KEY,
            message: process.env.OPENAI_API_KEY
              ? 'API key configured'
              : 'API key not found',
          };
          break;

        case 'gmail':
          testResult = {
            success:
              !!process.env.GMAIL_CLIENT_ID &&
              !!process.env.GMAIL_CLIENT_SECRET &&
              !!process.env.GMAIL_REFRESH_TOKEN,
            message:
              process.env.GMAIL_CLIENT_ID &&
              process.env.GMAIL_CLIENT_SECRET &&
              process.env.GMAIL_REFRESH_TOKEN
                ? 'Gmail API configured'
                : 'Gmail API credentials incomplete',
          };
          break;

        case 'google_places':
          testResult = {
            success: !!process.env.GOOGLE_PLACES_API_KEY,
            message: process.env.GOOGLE_PLACES_API_KEY
              ? 'API key configured'
              : 'API key not found',
          };
          break;

        case 'sentry':
          testResult = {
            success: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
            message: process.env.NEXT_PUBLIC_SENTRY_DSN
              ? 'Sentry configured'
              : 'Sentry DSN not found',
          };
          break;
      }

      return NextResponse.json({
        success: true,
        test: testResult,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
