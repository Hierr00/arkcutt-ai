/**
 * 🛡️ EMAIL CLASSIFIER GUARDRAILS
 * Decide si un email debe ser manejado por el agente o escalado a humano
 */

import { openai } from '@/lib/llm';
import { supabase } from '@/lib/supabase';
import { log } from '@/mastra';

export interface EmailClassification {
  decision: 'handle' | 'escalate' | 'ignore';
  confidence: number; // 0.0 - 1.0
  emailType:
    | 'quotation_request'
    | 'general_inquiry'
    | 'complaint'
    | 'spam'
    | 'out_of_scope'
    | 'follow_up';
  reasons: Array<{
    rule: string;
    passed: boolean;
    confidence?: number;
    details?: string;
  }>;
  actionRecommended: string;
  extractedData?: {
    hasTechnicalDrawing?: boolean;
    hasQuantity?: boolean;
    hasMaterial?: boolean;
    hasDeadline?: boolean;
    isUrgent?: boolean;
  };
}

/**
 * REGLA 1: Detectar keywords de solicitud de presupuesto
 */
function detectQuotationKeywords(subject: string, body: string): {
  passed: boolean;
  confidence: number;
  details: string;
} {
  const quotationKeywords = [
    'presupuesto',
    'cotización',
    'cotizar',
    'precio',
    'coste',
    'costo',
    'oferta',
    'solicitud',
    'necesito',
    'requiero',
    'piezas',
    'fabricar',
    'mecanizar',
    'pedido',
    'quote',
    'rfq',
  ];

  const text = `${subject} ${body}`.toLowerCase();

  const matches = quotationKeywords.filter((kw) => text.includes(kw));

  const confidence = Math.min(matches.length / 3, 1.0); // 3+ keywords = 100% confianza

  return {
    passed: matches.length >= 2, // Al menos 2 keywords
    confidence,
    details: `Encontradas ${matches.length} keywords: ${matches.join(', ')}`,
  };
}

/**
 * REGLA 2: Detectar adjuntos técnicos (PDFs, CAD)
 */
function detectTechnicalAttachments(attachments: any[]): {
  passed: boolean;
  confidence: number;
  details: string;
} {
  const technicalExtensions = [
    '.pdf',
    '.dxf',
    '.dwg',
    '.step',
    '.stp',
    '.iges',
    '.igs',
    '.stl',
    '.sldprt',
  ];

  const technicalFiles = attachments.filter((att) =>
    technicalExtensions.some((ext) =>
      att.filename.toLowerCase().endsWith(ext)
    )
  );

  return {
    passed: technicalFiles.length > 0,
    confidence: technicalFiles.length > 0 ? 0.9 : 0.1,
    details: `${technicalFiles.length} archivos técnicos encontrados: ${technicalFiles.map((f) => f.filename).join(', ')}`,
  };
}

/**
 * REGLA 3: Detectar señales de spam
 */
function detectSpam(subject: string, body: string, from: string): {
  passed: boolean;
  confidence: number;
  details: string;
} {
  const spamIndicators = [
    // Palabras típicas de spam
    'viagra',
    'casino',
    'lottery',
    'winner',
    'congratulations',
    'click here',
    'act now',
    'limited time',
    'free money',

    // Excesivo uso de mayúsculas
    /[A-Z]{10,}/,

    // Excesivo uso de signos de exclamación
    /!{3,}/,
  ];

  const text = `${subject} ${body}`;

  const spamMatches = spamIndicators.filter((indicator) => {
    if (typeof indicator === 'string') {
      return text.toLowerCase().includes(indicator);
    } else {
      return indicator.test(text);
    }
  });

  // Email sin dominio profesional
  const hasUnprofessionalDomain =
    from.includes('@gmail.com') ||
    from.includes('@hotmail.com') ||
    from.includes('@yahoo.com');

  const isSpam = spamMatches.length >= 2;

  return {
    passed: !isSpam, // Pasamos si NO es spam
    confidence: isSpam ? 0.95 : 0.1,
    details: isSpam
      ? `${spamMatches.length} indicadores de spam`
      : 'No parece spam',
  };
}

/**
 * REGLA 4: Detectar consultas fuera de alcance
 */
function detectOutOfScope(subject: string, body: string): {
  passed: boolean;
  confidence: number;
  details: string;
} {
  const outOfScopeKeywords = [
    // Servicios que NO hacen
    'impresión 3d',
    'soldadura',
    'pintura',
    'cromado',
    'galvanizado',
    'fundición',
    'estampación',

    // Temas no relacionados (NO incluir "entrega" - es normal en cotizaciones)
    'factura',
    'pago',
    'tracking',
    'complaint',
    'queja',
    'reclamo',
    'devolucion',
  ];

  const text = `${subject} ${body}`.toLowerCase();

  const outOfScopeMatches = outOfScopeKeywords.filter((kw) =>
    text.includes(kw)
  );

  const isOutOfScope = outOfScopeMatches.length >= 2; // Requerir al menos 2 keywords fuera de alcance

  return {
    passed: !isOutOfScope,
    confidence: isOutOfScope ? 0.8 : 0.2,
    details: isOutOfScope
      ? `Fuera de alcance: ${outOfScopeMatches.join(', ')}`
      : 'Dentro del alcance',
  };
}

/**
 * REGLA 5: Detectar quejas o problemas
 */
function detectComplaint(subject: string, body: string): {
  passed: boolean;
  confidence: number;
  details: string;
} {
  const complaintKeywords = [
    'queja',
    'reclamo',
    'problema',
    'insatisfecho',
    'decepcionado',
    'error',
    'equivocado',
    'mal',
    'defectuoso',
    'complaint',
  ];

  const text = `${subject} ${body}`.toLowerCase();

  const complaintMatches = complaintKeywords.filter((kw) => text.includes(kw));

  const isComplaint = complaintMatches.length >= 1;

  return {
    passed: !isComplaint,
    confidence: isComplaint ? 0.9 : 0.1,
    details: isComplaint
      ? `Posible queja: ${complaintMatches.join(', ')}`
      : 'No es queja',
  };
}

/**
 * REGLA 6: Usar LLM para clasificación final (solo si es ambiguo)
 */
async function llmClassification(
  subject: string,
  body: string,
  attachments: any[]
): Promise<{
  isQuotationRequest: boolean;
  confidence: number;
  extractedData: any;
}> {
  const prompt = `Analiza este email y determina si es una SOLICITUD DE PRESUPUESTO para mecanizado CNC.

IMPORTANTE: Solo es solicitud de presupuesto si el cliente:
- Necesita fabricar/mecanizar piezas
- Menciona cantidades, materiales, o adjunta planos
- Pide precio, cotización, o presupuesto

NO es solicitud de presupuesto si:
- Es una consulta general
- Es una queja o problema
- Pide servicios que no sean mecanizado CNC (soldadura, pintura, etc.)
- Es spam

EMAIL:
Asunto: ${subject}
Cuerpo: ${body}
Adjuntos: ${attachments.map((a) => a.filename).join(', ')}

Responde en formato JSON:
{
  "isQuotationRequest": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "explicación breve",
  "extractedData": {
    "hasTechnicalDrawing": boolean,
    "hasQuantity": boolean,
    "quantity": number | null,
    "hasMaterial": boolean,
    "material": string | null,
    "hasDeadline": boolean,
    "deadline": string | null,
    "isUrgent": boolean
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Modelo más barato para clasificación
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content!);

  return result;
}

/**
 * CLASIFICADOR PRINCIPAL
 */
export async function classifyEmail(
  email: {
    id: string;
    from: string;
    subject: string;
    body: string;
    attachments: any[];
  }
): Promise<EmailClassification> {
  log('info', `🛡️ Clasificando email de: ${email.from}`);

  const reasons = [];

  // PASO 1: Reglas determinísticas rápidas
  const keywordsCheck = detectQuotationKeywords(email.subject, email.body);
  reasons.push({
    rule: 'has_quotation_keywords',
    passed: keywordsCheck.passed,
    confidence: keywordsCheck.confidence,
    details: keywordsCheck.details,
  });

  const attachmentsCheck = detectTechnicalAttachments(email.attachments);
  reasons.push({
    rule: 'has_technical_attachments',
    passed: attachmentsCheck.passed,
    confidence: attachmentsCheck.confidence,
    details: attachmentsCheck.details,
  });

  const spamCheck = detectSpam(email.subject, email.body, email.from);
  reasons.push({
    rule: 'not_spam',
    passed: spamCheck.passed,
    confidence: spamCheck.confidence,
    details: spamCheck.details,
  });

  const scopeCheck = detectOutOfScope(email.subject, email.body);
  reasons.push({
    rule: 'within_scope',
    passed: scopeCheck.passed,
    confidence: scopeCheck.confidence,
    details: scopeCheck.details,
  });

  const complaintCheck = detectComplaint(email.subject, email.body);
  reasons.push({
    rule: 'not_complaint',
    passed: complaintCheck.passed,
    confidence: complaintCheck.confidence,
    details: complaintCheck.details,
  });

  // PASO 2: Decisión basada en reglas
  let decision: 'handle' | 'escalate' | 'ignore' = 'escalate'; // Default: escalate
  let emailType: EmailClassification['emailType'] = 'general_inquiry';
  let confidence = 0.5;

  // Si es spam obvio → IGNORE
  if (!spamCheck.passed && spamCheck.confidence > 0.9) {
    decision = 'ignore';
    emailType = 'spam';
    confidence = spamCheck.confidence;
  }
  // Si tiene keywords + adjuntos → HANDLE (alta prioridad - señal fuerte)
  else if (keywordsCheck.passed && attachmentsCheck.passed) {
    decision = 'handle';
    emailType = 'quotation_request';
    confidence = Math.min(
      (keywordsCheck.confidence + attachmentsCheck.confidence) / 2,
      0.95
    );
  }
  // Si es queja → ESCALATE (humano debe manejar)
  else if (!complaintCheck.passed && complaintCheck.confidence > 0.8) {
    decision = 'escalate';
    emailType = 'complaint';
    confidence = complaintCheck.confidence;
  }
  // Si es fuera de alcance → ESCALATE
  else if (!scopeCheck.passed && scopeCheck.confidence > 0.7) {
    decision = 'escalate';
    emailType = 'out_of_scope';
    confidence = scopeCheck.confidence;
  }
  // Si tiene keywords pero no adjuntos → Usar LLM para decidir
  else if (keywordsCheck.passed) {
    const llmResult = await llmClassification(
      email.subject,
      email.body,
      email.attachments
    );

    if (llmResult.isQuotationRequest && llmResult.confidence > 0.7) {
      decision = 'handle';
      emailType = 'quotation_request';
      confidence = llmResult.confidence;

      reasons.push({
        rule: 'llm_classification',
        passed: true,
        confidence: llmResult.confidence,
        details: (llmResult as any).reasoning,
      });
    } else {
      decision = 'escalate';
      emailType = 'general_inquiry';
      confidence = 1 - llmResult.confidence;
    }
  }
  // Ninguna señal clara → ESCALATE
  else {
    decision = 'escalate';
    emailType = 'general_inquiry';
    confidence = 0.6;
  }

  // PASO 3: Registrar en base de datos
  await supabase.from('guardrails_log').insert({
    email_id: email.id,
    email_from: email.from,
    email_subject: email.subject,
    email_body: email.body.substring(0, 500), // Primeros 500 chars
    decision,
    confidence,
    reasons,
    email_type: emailType,
    action_taken:
      decision === 'handle'
        ? 'created_quotation_request'
        : decision === 'escalate'
          ? 'escalated_to_human'
          : 'ignored',
  });

  const actionRecommended =
    decision === 'handle'
      ? 'Crear solicitud de presupuesto y comenzar recopilación de información'
      : decision === 'escalate'
        ? 'Notificar a humano para revisión manual'
        : 'Ignorar email (spam)';

  log('info', `✅ Email clasificado: ${decision} (${emailType}, ${Math.round(confidence * 100)}% confianza)`);

  return {
    decision,
    confidence,
    emailType,
    reasons,
    actionRecommended,
  };
}

/**
 * REGLA DE ORO: En caso de duda, ESCALATE
 * Es mejor que un humano revise un email legítimo
 * que el agente responda algo incorrecto
 */
export function shouldEscalateIfUncertain(
  classification: EmailClassification
): boolean {
  return classification.confidence < 0.75;
}
