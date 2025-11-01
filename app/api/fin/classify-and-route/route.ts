/**
 * Fin AI - Email Classification and Routing Endpoint
 *
 * This endpoint is called by Fin workflows to determine what to do with each email.
 * CRITICAL: Must respond in < 1 second for optimal UX
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type {
  ClassifyEmailRequest,
  ClassifyEmailResponse,
  RoutingAction,
  RoutingDecision,
} from '@/lib/types/fin-routing.types';
import {
  checkIfProvider,
  checkIfExistingCustomer,
  checkIfOutOfScope,
  checkIfSpam,
  checkQuotationIntent,
} from '@/lib/services/routing-helpers';
import { supabaseAdmin } from '@/lib/supabase';

// Validation schema
const ClassifyEmailSchema = z.object({
  from: z.string().email(),
  subject: z.string(),
  body: z.string(),
  thread_id: z.string(),
  has_attachments: z.boolean(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content_type: z.string(),
        size: z.number().optional(),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate request
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.FIN_API_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validatedData = ClassifyEmailSchema.parse(body);

    const { from, subject, body: emailBody, thread_id, has_attachments } = validatedData;

    // 3. Run classification logic (parallel where possible)
    const [providerCheck, customerCheck, spamCheck, scopeCheck] = await Promise.all([
      checkIfProvider(from),
      checkIfExistingCustomer(from, thread_id),
      Promise.resolve(checkIfSpam(subject, emailBody, from)),
      Promise.resolve(checkIfOutOfScope(subject, emailBody)),
    ]);

    // 4. Decision tree (order matters - highest priority first)

    // PRIORITY 1: Spam - ignore immediately
    if (spamCheck.isSpam && spamCheck.confidence > 0.7) {
      const response = buildResponse({
        routing_decision: 'OUT_OF_SCOPE',
        action: 'IGNORE',
        confidence: spamCheck.confidence,
        reason: 'spam_detected',
      });

      await logRouting(from, subject, thread_id, response, Date.now() - startTime);
      return NextResponse.json(response);
    }

    // PRIORITY 2: Provider response - process externally
    if (providerCheck.isProvider) {
      const response = buildResponse({
        routing_decision: 'PROVIDER_RESPONSE',
        action: 'CLOSE_AND_PROCESS_EXTERNALLY',
        confidence: 1.0,
        reason: 'email_from_known_provider',
        automated_reply: `Hola, gracias por tu cotización. La estamos procesando y te contactaremos si necesitamos alguna aclaración.\n\nSaludos,\nEquipo Arkcutt`,
        metadata: providerCheck.context,
      });

      await logRouting(from, subject, thread_id, response, Date.now() - startTime);
      return NextResponse.json(response);
    }

    // PRIORITY 3: Out of scope (admin emails) - ignore
    if (scopeCheck.isOutOfScope) {
      const response = buildResponse({
        routing_decision: 'OUT_OF_SCOPE',
        action: 'IGNORE',
        confidence: 1.0,
        reason: `out_of_scope:${scopeCheck.reason}`,
        metadata: { category: scopeCheck.reason },
      });

      await logRouting(from, subject, thread_id, response, Date.now() - startTime);
      return NextResponse.json(response);
    }

    // PRIORITY 4: Existing customer - continue with Fin (with context)
    if (customerCheck.isExisting) {
      const response = buildResponse({
        routing_decision: 'CUSTOMER_FOLLOWUP',
        action: 'CONTINUE_WITH_FIN',
        confidence: 1.0,
        reason: 'existing_customer_thread',
        context: customerCheck.context,
      });

      await logRouting(from, subject, thread_id, response, Date.now() - startTime);
      return NextResponse.json(response);
    }

    // PRIORITY 5: Check quotation intent for new inquiries
    const intentCheck = checkQuotationIntent(subject, emailBody, has_attachments);

    if (intentCheck.hasIntent) {
      const response = buildResponse({
        routing_decision: 'CUSTOMER_INQUIRY',
        action: 'CONTINUE_WITH_FIN',
        confidence: intentCheck.confidence,
        reason: has_attachments ? 'technical_attachments_detected' : 'quotation_keywords_detected',
        context: {
          existing_customer: false,
          detected_intent: 'quotation_request',
          has_technical_attachments: has_attachments,
        },
      });

      await logRouting(from, subject, thread_id, response, Date.now() - startTime);
      return NextResponse.json(response);
    }

    // PRIORITY 6: Uncertain - escalate to human
    const response = buildResponse({
      routing_decision: 'UNCERTAIN',
      action: 'ESCALATE_TO_HUMAN',
      confidence: 0.5,
      reason: 'no_clear_intent_detected',
      escalation_message: `Gracias por contactarnos. Un miembro de nuestro equipo revisará tu mensaje y te responderá en breve.`,
    });

    await logRouting(from, subject, thread_id, response, Date.now() - startTime);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[classify-and-route] Error:', error);

    // If validation error, return 400
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // For other errors, escalate to human as fallback
    return NextResponse.json({
      routing_decision: 'UNCERTAIN',
      action: 'ESCALATE_TO_HUMAN',
      confidence: 0,
      reason: 'classification_error',
      escalation_message: 'Gracias por contactarnos. Un miembro de nuestro equipo te responderá en breve.',
    });
  }
}

/**
 * Build standardized response object
 */
function buildResponse(params: {
  routing_decision: RoutingDecision;
  action: RoutingAction;
  confidence: number;
  reason: string;
  automated_reply?: string;
  escalation_message?: string;
  context?: any;
  metadata?: any;
}): ClassifyEmailResponse {
  return {
    routing_decision: params.routing_decision,
    action: params.action,
    confidence: params.confidence,
    reason: params.reason,
    ...(params.automated_reply && { automated_reply: params.automated_reply }),
    ...(params.escalation_message && { escalation_message: params.escalation_message }),
    ...(params.context && { context: params.context }),
    ...(params.metadata && { metadata: params.metadata }),
  };
}

/**
 * Log routing decision to database
 * Runs async without blocking response
 */
async function logRouting(
  emailFrom: string,
  emailSubject: string,
  threadId: string,
  response: ClassifyEmailResponse,
  responseTimeMs: number
) {
  try {
    if (!supabaseAdmin) {
      console.warn('[classify-and-route] Supabase admin not available, skipping log');
      return;
    }

    await supabaseAdmin.from('routing_logs').insert({
      email_from: emailFrom,
      email_subject: emailSubject,
      thread_id: threadId,
      routing_decision: response.routing_decision,
      action: response.action,
      confidence: response.confidence,
      reason: response.reason,
      response_time_ms: responseTimeMs,
      metadata: {
        context: response.context,
        ...response.metadata,
      },
      created_at: new Date().toISOString(),
    });

    // Log performance warning if too slow
    if (responseTimeMs > 1000) {
      console.warn(`[classify-and-route] Slow response: ${responseTimeMs}ms for ${emailFrom}`);
    }
  } catch (error) {
    console.error('[classify-and-route] Failed to log routing:', error);
    // Don't throw - logging failure shouldn't break the endpoint
  }
}
