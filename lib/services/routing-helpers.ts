/**
 * Fast DB lookup helpers for email routing
 * These functions MUST be optimized to return in < 500ms
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { CustomerContext, ProviderContext } from '@/lib/types/fin-routing.types';

/**
 * Check if email belongs to a known provider
 * Uses indexed lookup on email field
 */
export async function checkIfProvider(email: string): Promise<{
  isProvider: boolean;
  context?: ProviderContext;
}> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data: provider, error } = await supabaseAdmin
    .from('provider_contacts')
    .select('id, company_name, email')
    .eq('email', email)
    .single();

  if (error || !provider) {
    return { isProvider: false };
  }

  // Try to find related RFQ
  const { data: rfq } = await supabaseAdmin
    .from('external_quotations')
    .select('id, quotation_request_id')
    .eq('provider_email', email)
    .in('status', ['sent', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    isProvider: true,
    context: {
      provider_id: provider.id,
      provider_name: provider.company_name,
      rfq_id: rfq?.id,
      quotation_request_id: rfq?.quotation_request_id,
    },
  };
}

/**
 * Check if email is from existing customer
 * Looks up by email and thread_id
 */
export async function checkIfExistingCustomer(
  email: string,
  threadId?: string
): Promise<{
  isExisting: boolean;
  context?: CustomerContext;
}> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Build query conditions
  let query = supabaseAdmin
    .from('quotation_requests')
    .select('id, customer_email, conversation_thread_id, created_at, status')
    .order('created_at', { ascending: false });

  // Try to find by thread_id first (most accurate)
  if (threadId) {
    const { data: byThread } = await query.eq('conversation_thread_id', threadId).limit(1).single();

    if (byThread) {
      const history = await getCustomerHistory(email);
      return {
        isExisting: true,
        context: {
          existing_customer: true,
          previous_quotation_id: byThread.id,
          customer_history: history,
        },
      };
    }
  }

  // Fallback: search by email
  const { data: quotations } = await query.eq('customer_email', email).limit(1);

  if (!quotations || quotations.length === 0) {
    return { isExisting: false };
  }

  const history = await getCustomerHistory(email);

  return {
    isExisting: true,
    context: {
      existing_customer: true,
      previous_quotation_id: quotations[0].id,
      customer_history: history,
    },
  };
}

/**
 * Get customer history for context
 */
async function getCustomerHistory(email: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { data: quotations } = await supabaseAdmin
    .from('quotation_requests')
    .select('id, status, created_at')
    .eq('customer_email', email);

  if (!quotations) {
    return {
      total_quotations: 0,
      last_interaction_date: new Date(),
      successful_orders: 0,
    };
  }

  const successfulOrders = quotations.filter((q) => q.status === 'quoted' || q.status === 'completed').length;

  return {
    total_quotations: quotations.length,
    last_interaction_date: new Date(quotations[0]?.created_at || new Date()),
    successful_orders: successfulOrders,
  };
}

/**
 * Check if email is spam or out of scope
 * Uses fast keyword matching
 */
export function checkIfOutOfScope(subject: string, body: string): {
  isOutOfScope: boolean;
  reason: string;
} {
  const text = (subject + ' ' + body).toLowerCase();

  // Define out-of-scope patterns
  const patterns = [
    {
      keywords: ['nómina', 'nomina', 'salario', 'sueldo'],
      reason: 'RRHH',
    },
    {
      keywords: ['factura', 'pago', 'transferencia', 'invoice', 'payment'],
      reason: 'Contabilidad',
    },
    {
      keywords: ['contrato', 'despido', 'baja laboral', 'finiquito'],
      reason: 'Legal',
    },
    {
      keywords: ['soporte técnico', 'incidencia', 'error sistema', 'bug'],
      reason: 'IT Support',
    },
    {
      keywords: ['marketing', 'publicidad', 'anuncio', 'campaña'],
      reason: 'Marketing',
    },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some((kw) => text.includes(kw))) {
      return {
        isOutOfScope: true,
        reason: pattern.reason,
      };
    }
  }

  return { isOutOfScope: false, reason: '' };
}

/**
 * Check if email looks like spam
 * Uses heuristics and keyword matching
 */
export function checkIfSpam(subject: string, body: string, from: string): {
  isSpam: boolean;
  confidence: number;
} {
  const text = subject + ' ' + body;
  const textLower = text.toLowerCase();

  let spamScore = 0;

  // Spam indicators with weights
  const indicators = [
    { pattern: /click (here|aquí|aqu[ií])/gi, weight: 0.2 },
    { pattern: /oferta limitada/gi, weight: 0.25 },
    { pattern: /ganador|ganaste|felicidades/gi, weight: 0.3 },
    { pattern: /100% gratis/gi, weight: 0.3 },
    { pattern: /(viagra|casino|lottery|lotería)/gi, weight: 0.5 },
    { pattern: /aumenta (tu|tus)/gi, weight: 0.15 },
    { pattern: /gana dinero/gi, weight: 0.25 },
  ];

  // Check each indicator
  indicators.forEach(({ pattern, weight }) => {
    const matches = text.match(pattern);
    if (matches) {
      spamScore += weight * matches.length;
    }
  });

  // Multiple external links indicator
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount > 5) {
    spamScore += 0.2;
  }

  // All caps subject
  if (subject === subject.toUpperCase() && subject.length > 10) {
    spamScore += 0.15;
  }

  // Suspicious TLDs
  const suspiciousTLDs = ['.xyz', '.top', '.gq', '.ml', '.cf'];
  if (suspiciousTLDs.some((tld) => from.includes(tld))) {
    spamScore += 0.2;
  }

  return {
    isSpam: spamScore > 0.5,
    confidence: Math.min(spamScore, 1.0),
  };
}

/**
 * Check if email has quotation intent
 * Returns confidence score 0-1
 */
export function checkQuotationIntent(
  subject: string,
  body: string,
  hasAttachments: boolean
): {
  hasIntent: boolean;
  confidence: number;
} {
  const text = (subject + ' ' + body).toLowerCase();

  const quotationKeywords = [
    { word: 'presupuesto', weight: 0.3 },
    { word: 'cotización', weight: 0.3 },
    { word: 'cotizacion', weight: 0.3 },
    { word: 'precio', weight: 0.15 },
    { word: 'coste', weight: 0.15 },
    { word: 'mecanizar', weight: 0.25 },
    { word: 'fabricar', weight: 0.2 },
    { word: 'piezas', weight: 0.15 },
    { word: 'unidades', weight: 0.1 },
    { word: 'cantidad', weight: 0.1 },
    { word: 'material', weight: 0.1 },
    { word: 'aluminio', weight: 0.15 },
    { word: 'acero', weight: 0.15 },
    { word: 'planos', weight: 0.2 },
    { word: 'especificaciones', weight: 0.15 },
    { word: 'tolerancias', weight: 0.2 },
  ];

  let confidence = 0;

  // Check keywords
  quotationKeywords.forEach(({ word, weight }) => {
    if (text.includes(word)) {
      confidence += weight;
    }
  });

  // Technical attachments are strong indicator
  if (hasAttachments) {
    confidence += 0.4;
  }

  return {
    hasIntent: confidence >= 0.4,
    confidence: Math.min(confidence, 1.0),
  };
}

/**
 * Find RFQ related to provider email
 * Used when provider email matches by subject or thread
 */
export async function findRelatedRFQ(providerEmail: string, subject: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Try to extract RFQ ID from subject (e.g., "Re: RFQ-123")
  const rfqIdMatch = subject.match(/RFQ-(\d+)/i);

  if (rfqIdMatch) {
    const rfqId = rfqIdMatch[1];
    const { data } = await supabaseAdmin
      .from('external_quotations')
      .select('id, quotation_request_id')
      .eq('id', rfqId)
      .single();

    return data;
  }

  // Fallback: find most recent RFQ for this provider
  const { data } = await supabaseAdmin
    .from('external_quotations')
    .select('id, quotation_request_id')
    .eq('provider_email', providerEmail)
    .in('status', ['sent', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}
