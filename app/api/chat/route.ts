/**
 * 🎯 API ROUTE: Chat
 * Endpoint principal para interacción con el sistema de agentes
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetRequestWorkflow } from '@/mastra/workflows/budget-request.workflow';
import { WorkflowInputSchema } from '@/types/workflow.types';
import { log } from '@/mastra';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 segundos máximo

export async function POST(req: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      log('error', '❌ OPENAI_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
          message: 'OPENAI_API_KEY not configured. Please add it to .env.local',
        },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      log('error', '❌ Supabase not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
          message: 'Supabase credentials not configured. Please add them to .env.local',
        },
        { status: 500 }
      );
    }

    // Parse body
    const body = await req.json();

    // Validate input
    const validatedInput = WorkflowInputSchema.parse(body);

    log('info', '📨 Chat API request received', {
      sessionId: validatedInput.sessionId,
      userId: validatedInput.userId,
      messageCount: validatedInput.messages.length,
    });

    // Execute workflow
    log('info', '🚀 Starting workflow execution');
    const result = await budgetRequestWorkflow(validatedInput);
    log('info', '✅ Workflow completed successfully');

    // Return response
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    log('error', '❌ Chat API error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input format',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle OpenAI errors
    if (error.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API error',
          message: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local',
        },
        { status: 500 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      },
      { status: 500 }
    );
  }
}
