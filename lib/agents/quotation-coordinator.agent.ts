/**
 * 🎯 QUOTATION COORDINATOR AGENT
 * Orquesta todo el workflow de pre-cotización desde email entrante hasta información completa
 */

import { openai } from '@/lib/llm';
import { supabase } from '@/lib/supabase';
import { log } from '@/mastra';
import { generateServicesPrompt } from '@/lib/services/settings.service';
import { openaiLimiter, withRateLimit } from '@/lib/rate-limiter';

// Tools
import {
  readUnreadQuotationEmails,
  sendEmail,
  getEmailAttachments,
  markEmailAsRead,
  addLabelToEmail,
  processEmailPDFAttachments,
} from '@/lib/tools/gmail.tools';
import {
  findProviders,
  getProviderDetails,
} from '@/lib/tools/provider-search.tools';
import { classifyEmail } from '@/lib/guardrails/email-classifier';

export interface QuotationRequest {
  id: string;
  status: string;
  customerEmail: string;
  customerName?: string;
  missingInfo: string[];
  externalServices: Array<{
    service: string;
    material?: string;
    quantity?: number;
  }>;
}

/**
 * STEP 1: Process New Emails
 * Lee emails no leídos, clasifica con guardrails, y crea quotation_requests
 */
export async function processNewEmails(): Promise<{
  processed: number;
  handled: number;
  escalated: number;
  ignored: number;
}> {
  try {
    log('info', '📬 Iniciando procesamiento de emails nuevos...');

    // 1. Leer emails no leídos
    const emails = await readUnreadQuotationEmails();

    if (emails.length === 0) {
      log('info', '✅ No hay emails nuevos para procesar');
      return { processed: 0, handled: 0, escalated: 0, ignored: 0 };
    }

    log('info', `📧 Procesando ${emails.length} emails...`);

    let handled = 0;
    let escalated = 0;
    let ignored = 0;

    // 2. Procesar cada email
    for (const email of emails) {
      try {
        // 2a. FILTRO RÁPIDO: Detectar spam común sin usar OpenAI (ahorro de costos)
        const spamDomains = [
          'substack.com',
          'revolut.com',
          'framer.com',
          'replit.com',
          'reflag.com',
          'spline.design',
          'skool.com',
          'link.com',
          'google.com',
          'ryanairemail.com',
          'uploadcare.com',
          'sorare.com',
          'singulart.com',
          'noreply@',
          'no-reply@',
          'marketing@',
        ];

        const isLikelySpam = spamDomains.some(domain => email.from.toLowerCase().includes(domain));

        if (isLikelySpam) {
          log('info', `🚫 Email de ${email.from} filtrado como spam (ahorro de tokens)`);
          await addLabelToEmail(email.id, 'Arkcutt/Spam');
          await markEmailAsRead(email.id);
          ignored++;
          continue;
        }

        // 2b. Verificar si es parte de un thread existente
        const { data: existingQuotation } = await supabase
          .from('quotation_requests')
          .select('id, status, customer_email')
          .eq('conversation_thread_id', email.threadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingQuotation) {
          // Es una respuesta a un quotation existente
          log('info', `🔄 Email es respuesta a quotation existente: ${existingQuotation.id}`);
          await updateQuotationFromReply(existingQuotation.id, email);
          await addLabelToEmail(email.id, 'Arkcutt/Updated');
          await markEmailAsRead(email.id);
          handled++;
          continue;
        }

        // 2c. Email nuevo - Clasificar con guardrails (usa OpenAI)
        const classification = await classifyEmail({
          id: email.id,
          from: email.from,
          subject: email.subject,
          body: email.body,
          attachments: email.attachments,
        });

        log(
          'info',
          `📊 Email de ${email.from}: ${classification.decision} (${Math.round(classification.confidence * 100)}% confianza)`
        );

        // 2c. Actuar según decisión
        if (classification.decision === 'handle') {
          // Crear quotation_request
          await createQuotationRequest(email, classification);
          await addLabelToEmail(email.id, 'Arkcutt/Handled');
          handled++;
        } else if (classification.decision === 'escalate') {
          // Escalar a humano
          await escalateToHuman(email, classification);
          await addLabelToEmail(email.id, 'Arkcutt/Escalated');
          escalated++;
        } else {
          // Ignorar (spam)
          await addLabelToEmail(email.id, 'Arkcutt/Spam');
          ignored++;
        }

        // 2d. Marcar como leído
        await markEmailAsRead(email.id);
      } catch (error: any) {
        log('error', `❌ Error procesando email ${email.id}`, {
          error: error.message,
        });
      }
    }

    log(
      'info',
      `✅ Procesados ${emails.length} emails: ${handled} handled, ${escalated} escalated, ${ignored} ignored`
    );

    return {
      processed: emails.length,
      handled,
      escalated,
      ignored,
    };
  } catch (error: any) {
    log('error', '❌ Error en processNewEmails', { error: error.message });
    throw error;
  }
}

/**
 * STEP 2: Create Quotation Request
 * Crea un quotation_request en BD y extrae información inicial
 */
async function createQuotationRequest(
  email: any,
  classification: any
): Promise<string> {
  try {
    log('info', `📝 Creando quotation_request para ${email.from}`);

    // Extraer información básica del email usando LLM
    const extractedInfo = await extractInfoFromEmail(email);

    // Procesar PDFs adjuntos si los hay
    let processedAttachments = email.attachments.map((att: any) => ({
      filename: att.filename,
      mimeType: att.mimeType,
      attachmentId: att.attachmentId,
    }));

    let pdfTechnicalInfo: any = {};

    if (email.attachments && email.attachments.length > 0) {
      const hasPDFs = email.attachments.some((att: any) => att.mimeType === 'application/pdf');

      if (hasPDFs) {
        log('info', '📄 Procesando PDFs adjuntos...');
        try {
          const processed = await processEmailPDFAttachments(email.id, email.attachments);

          // Guardar información procesada
          processedAttachments = processed.map((att) => ({
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            pdfData: att.pdfData,
          }));

          // Extraer información técnica de los PDFs
          const pdfsWithData = processed.filter((att) => att.pdfData);
          if (pdfsWithData.length > 0) {
            // Combinar información de todos los PDFs
            pdfTechnicalInfo = pdfsWithData.reduce((acc, att) => {
              if (!att.pdfData) return acc;

              return {
                material: att.pdfData.technicalInfo.material || acc.material,
                quantity: att.pdfData.technicalInfo.quantity || acc.quantity,
                dimensions: [...(acc.dimensions || []), ...(att.pdfData.technicalInfo.dimensions || [])],
                tolerances: [...(acc.tolerances || []), ...(att.pdfData.technicalInfo.tolerances || [])],
                surfaceFinish: att.pdfData.technicalInfo.surfaceFinish || acc.surfaceFinish,
                partName: att.pdfData.technicalInfo.partName || acc.partName,
                specifications: [...(acc.specifications || []), ...(att.pdfData.technicalInfo.specifications || [])],
                pdfConfidence: Math.max(acc.pdfConfidence || 0, att.pdfData.confidence),
              };
            }, {
              material: undefined,
              quantity: undefined,
              dimensions: [],
              tolerances: [],
              surfaceFinish: undefined,
              partName: undefined,
              specifications: [],
              pdfConfidence: 0,
            } as any);

            log('info', '✅ Información técnica extraída de PDFs', {
              material: pdfTechnicalInfo.material,
              quantity: pdfTechnicalInfo.quantity,
              confidence: pdfTechnicalInfo.pdfConfidence,
            });
          }
        } catch (pdfError: any) {
          log('error', '❌ Error procesando PDFs, continuando sin datos de PDF', {
            error: pdfError.message,
          });
        }
      }
    }

    // Combinar información del email y de los PDFs (PDFs tienen prioridad si están presentes)
    const finalInfo = {
      customerName: extractedInfo.customerName,
      customerCompany: extractedInfo.customerCompany,
      partsDescription: extractedInfo.partsDescription || pdfTechnicalInfo.partName,
      quantity: pdfTechnicalInfo.quantity || extractedInfo.quantity,
      material: pdfTechnicalInfo.material || extractedInfo.material,
      tolerances: pdfTechnicalInfo.tolerances?.join(', ') || extractedInfo.tolerances,
      deadline: extractedInfo.deadline,
      surfaceFinish: pdfTechnicalInfo.surfaceFinish,
    };

    // Insertar en BD
    const { data, error } = await supabase
      .from('quotation_requests')
      .insert({
        external_id: email.id,
        status: 'pending',
        customer_email: extractEmailAddress(email.from),
        customer_name: finalInfo.customerName,
        customer_company: finalInfo.customerCompany,
        parts_description: finalInfo.partsDescription,
        quantity: finalInfo.quantity,
        material_requested: finalInfo.material,
        tolerances: finalInfo.tolerances,
        surface_finish: finalInfo.surfaceFinish,
        delivery_deadline: finalInfo.deadline,
        attachments: processedAttachments,
        missing_info: extractedInfo.missingInfo,
        conversation_thread_id: email.threadId,
        last_interaction: new Date(),
        agent_analysis: {
          source: 'email',
          classification: classification.emailType,
          confidence: classification.confidence,
          extractedData: classification.extractedData,
          pdfExtracted: Object.keys(pdfTechnicalInfo).length > 0 ? pdfTechnicalInfo : undefined,
        },
      })
      .select()
      .single();

    if (error) throw error;

    log('info', `✅ Quotation request creado: ${data.id}`);

    // Registrar interacción
    await supabase.from('quotation_interactions').insert({
      quotation_request_id: data.id,
      type: 'email_received',
      direction: 'inbound',
      subject: email.subject,
      body: email.body,
      attachments: email.attachments,
      gmail_message_id: email.id,
      gmail_thread_id: email.threadId,
      extracted_data: extractedInfo,
    });

    // PASO 1: Enviar email de confirmación al cliente
    log('debug', `🚀 Iniciando PASO 1: enviar confirmación para ${data.id}`);
    try {
      await sendInitialConfirmationEmail(data.id, email);
      log('debug', `✅ PASO 1 completado: confirmación enviada`);
    } catch (confirmError: any) {
      log('error', `❌ PASO 1 falló: ${confirmError.message}`, {
        stack: confirmError.stack,
      });
    }

    // PASO 2: Analizar qué falta
    log('debug', `🚀 Iniciando PASO 2: analizar info faltante para ${data.id}`);
    await analyzeAndRequestMissingInfo(data.id);

    return data.id;
  } catch (error: any) {
    log('error', '❌ Error creando quotation_request', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * STEP 2.5: Send Initial Confirmation Email
 * Envía email de confirmación inmediata al cliente
 */
async function sendInitialConfirmationEmail(
  quotationRequestId: string,
  email: any
): Promise<void> {
  try {
    log('info', `Enviando email de confirmación a ${email.from}`);

    const { data: qr } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('id', quotationRequestId)
      .single();

    if (!qr) return;

    const confirmationEmail = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Confirmación de Solicitud de Presupuesto</h2>

  <p>Estimado/a ${qr.customer_name || 'cliente'},</p>

  <p>Hemos recibido su solicitud de presupuesto correctamente y nuestro equipo ya está trabajando en ella.</p>

  <h3>Información recibida:</h3>
  <ul>
    ${qr.parts_description ? `<li><strong>Descripción:</strong> ${qr.parts_description}</li>` : ''}
    ${qr.quantity ? `<li><strong>Cantidad:</strong> ${qr.quantity} unidades</li>` : ''}
    ${qr.material_requested ? `<li><strong>Material:</strong> ${qr.material_requested}</li>` : ''}
  </ul>

  <p>En breve le enviaremos un presupuesto detallado. Si necesita información adicional, nos pondremos en contacto con usted.</p>

  <p>Gracias por confiar en Arkcutt.</p>

  <p>Saludos cordiales,<br>
  <strong>Equipo Arkcutt</strong><br>
  Mecanizado CNC de Precisión</p>
</body>
</html>`;

    await sendEmail({
      to: qr.customer_email,
      subject: `Re: ${email.subject}`,
      body: confirmationEmail,
      bodyHtml: confirmationEmail,
      threadId: qr.conversation_thread_id,
    });

    // Intentar guardar la interacción
    const { error: insertError } = await supabase.from('quotation_interactions').insert({
      quotation_request_id: quotationRequestId,
      type: 'confirmation_sent',
      direction: 'outbound',
      subject: `Re: ${email.subject}`,
      body: confirmationEmail,
      agent_intent: 'confirm_receipt',
    });

    if (insertError) {
      log('warn', '⚠️ No se pudo guardar interacción en BD (problema de caché de Supabase)', {
        error: insertError.message,
        note: 'El email SÍ fue enviado correctamente al cliente'
      });
      // No bloquear el workflow - el email ya se envió exitosamente
    }

    log('info', '✅ Email de confirmación enviado Y guardado en BD');
  } catch (error: any) {
    log('error', 'Error enviando confirmación', { error: error.message });
  }
}

/**
 * STEP 2.6: Update Quotation From Reply
 * Actualiza un quotation existente cuando el cliente responde
 */
async function updateQuotationFromReply(
  quotationRequestId: string,
  email: any
): Promise<void> {
  try {
    log('info', `🔄 Actualizando quotation ${quotationRequestId} con respuesta del cliente`);

    // Extraer nueva información del email
    const extractedInfo = await extractInfoFromEmail(email);

    // Obtener quotation actual
    const { data: currentQr } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('id', quotationRequestId)
      .single();

    if (!currentQr) {
      log('error', '❌ Quotation no encontrado');
      return;
    }

    // Merge de información: mantener lo que ya existe, actualizar lo que llega
    const updatedData: any = {
      last_interaction: new Date(),
    };

    // Actualizar solo campos que vengan con valor
    if (extractedInfo.customerName && !currentQr.customer_name) {
      updatedData.customer_name = extractedInfo.customerName;
    }
    if (extractedInfo.customerCompany && !currentQr.customer_company) {
      updatedData.customer_company = extractedInfo.customerCompany;
    }
    if (extractedInfo.partsDescription && !currentQr.parts_description) {
      updatedData.parts_description = extractedInfo.partsDescription;
    }
    if (extractedInfo.quantity && !currentQr.quantity) {
      updatedData.quantity = extractedInfo.quantity;
    }
    if (extractedInfo.material && !currentQr.material_requested) {
      updatedData.material_requested = extractedInfo.material;
    }
    if (extractedInfo.tolerances && !currentQr.tolerances) {
      updatedData.tolerances = extractedInfo.tolerances;
    }
    if (extractedInfo.deadline && !currentQr.delivery_deadline) {
      updatedData.delivery_deadline = extractedInfo.deadline;
    }

    // Recalcular missing_info
    updatedData.missing_info = extractedInfo.missingInfo || [];

    // Actualizar en BD
    const { error: updateError } = await supabase
      .from('quotation_requests')
      .update(updatedData)
      .eq('id', quotationRequestId);

    if (updateError) throw updateError;

    // Registrar interacción
    await supabase.from('quotation_interactions').insert({
      quotation_request_id: quotationRequestId,
      type: 'email_received',
      direction: 'inbound',
      subject: email.subject,
      body: email.body,
      attachments: email.attachments,
      gmail_message_id: email.id,
      gmail_thread_id: email.threadId,
      extracted_data: extractedInfo,
    });

    log('info', `✅ Quotation actualizado, missing_info: ${updatedData.missing_info.join(', ')}`);

    // Analizar si ahora tenemos toda la información necesaria
    await analyzeAndRequestMissingInfo(quotationRequestId);
  } catch (error: any) {
    log('error', '❌ Error actualizando quotation desde reply', {
      error: error.message,
    });
  }
}

/**
 * STEP 3: Extract Information from Email
 * Usa LLM para extraer datos estructurados del email
 */
async function extractInfoFromEmail(email: any): Promise<{
  customerName?: string;
  customerCompany?: string;
  partsDescription?: string;
  quantity?: number;
  material?: string;
  tolerances?: string;
  deadline?: string;
  missingInfo: string[];
}> {
  try {
    const prompt = `Analiza este email de solicitud de presupuesto y extrae TODA la información técnica.

EMAIL:
De: ${email.from}
Asunto: ${email.subject}
Cuerpo: ${email.body}
Adjuntos: ${email.attachments.map((a: any) => a.filename).join(', ')}

IMPORTANTE:
- Extrae información solo si está EXPLÍCITAMENTE mencionada
- Si algo no está claro o falta, añádelo a missingInfo
- Para material, busca menciones específicas (ej: "aluminio 7075", "acero inoxidable 316")
- Para cantidad, busca números específicos (ej: "100 piezas", "50 unidades")
- Para tolerancias, busca menciones técnicas (ej: "±0.1mm", "ISO 2768-m")

Responde en formato JSON:
{
  "customerName": string | null,
  "customerCompany": string | null,
  "partsDescription": string | null,
  "quantity": number | null,
  "material": string | null,
  "tolerances": string | null,
  "deadline": string | null (formato ISO 8601),
  "missingInfo": string[] // Lista de información que falta, ej: ["material_especifico", "cantidad", "tolerancias"]
}`;

    const response = await withRateLimit(
      openaiLimiter,
      () => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      { priority: 7 } // Alta prioridad para análisis
    );

    const result = JSON.parse(response.choices[0].message.content!);

    log('debug', '📋 Información extraída del email', result);

    return result;
  } catch (error: any) {
    log('error', '❌ Error extrayendo información', { error: error.message });
    return { missingInfo: [] };
  }
}

/**
 * STEP 4: Analyze and Request Missing Info
 * Analiza qué información falta y la solicita al cliente
 */
async function analyzeAndRequestMissingInfo(
  quotationRequestId: string
): Promise<void> {
  try {
    log('info', `🔍 Analizando información faltante: ${quotationRequestId}`);

    // Obtener quotation_request
    const { data: qr, error } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('id', quotationRequestId)
      .single();

    if (error) throw error;

    // Verificar qué falta
    const missingInfo = qr.missing_info || [];

    // IMPORTANTE: Identificar servicios externos SIEMPRE (no solo cuando no falta info)
    log('info', '🔎 Identificando servicios externos...');
    await identifyExternalServices(quotationRequestId);

    // Si no falta información, pasar a siguiente paso
    if (missingInfo.length === 0) {
      log('info', '✅ Información completa, procesamiento continúa...');
      await updateQuotationStatus(quotationRequestId, 'gathering_info');
      return;
    }

    log('info', `📝 Falta información: ${missingInfo.join(', ')}`);

    // Generar email solicitando información
    const emailBody = await generateMissingInfoEmail(qr, missingInfo);

    // Enviar email
    await sendEmail({
      to: qr.customer_email,
      subject: `Re: ${qr.parts_description || 'Solicitud de presupuesto'}`,
      body: emailBody,
      bodyHtml: emailBody,
      threadId: qr.conversation_thread_id,
    });

    // Registrar interacción
    await supabase.from('quotation_interactions').insert({
      quotation_request_id: quotationRequestId,
      type: 'info_request',
      direction: 'outbound',
      subject: 'Solicitud de información adicional',
      body: emailBody,
      agent_intent: 'request_missing_info',
    });

    // Actualizar estado
    await updateQuotationStatus(quotationRequestId, 'gathering_info');

    log('info', '✅ Email de solicitud de información enviado');
  } catch (error: any) {
    log('error', '❌ Error solicitando información faltante', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * STEP 5: Generate Missing Info Email
 * Genera un email profesional pidiendo info faltante
 */
async function generateMissingInfoEmail(
  qr: any,
  missingInfo: string[]
): Promise<string> {
  const prompt = `Genera un email profesional y amigable para solicitar información faltante a un cliente.

CONTEXTO:
- Cliente: ${qr.customer_name || qr.customer_email}
- Empresa: ${qr.customer_company || 'N/A'}
- Descripción de piezas: ${qr.parts_description || 'N/A'}
- Información que YA tenemos:
  ${qr.quantity ? `- Cantidad: ${qr.quantity}` : ''}
  ${qr.material_requested ? `- Material: ${qr.material_requested}` : ''}
  ${qr.tolerances ? `- Tolerancias: ${qr.tolerances}` : ''}

INFORMACIÓN QUE FALTA:
${missingInfo.map((info) => `- ${info}`).join('\n')}

TONO:
- Profesional pero cercano
- Agradecer el interés
- Explicar que necesitamos esta información para dar un presupuesto preciso
- Ofrecer ayuda si tienen dudas

Responde SOLO con el HTML del email (sin explicaciones adicionales).
Incluye saludo, cuerpo, y firma "Equipo Arkcutt".`;

  const response = await withRateLimit(
    openaiLimiter,
    () => openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
    { priority: 6 } // Prioridad media-alta para generación de emails
  );

  return response.choices[0].message.content!;
}

/**
 * STEP 6: Identify External Services
 * Identifica servicios que requieren proveedores externos
 */
async function identifyExternalServices(
  quotationRequestId: string
): Promise<void> {
  try {
    log('info', `🔎 Identificando servicios externos: ${quotationRequestId}`);

    // Obtener quotation_request
    const { data: qr, error } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('id', quotationRequestId)
      .single();

    if (error) throw error;

    // Obtener configuración dinámica de servicios
    const servicesConfig = await generateServicesPrompt();

    // Usar LLM para identificar servicios externos necesarios
    const prompt = `Analiza esta solicitud de mecanizado CNC e identifica QUÉ SERVICIOS EXTERNOS se necesitan.

INFORMACIÓN DEL PEDIDO:
- Descripción: ${qr.parts_description}
- Material: ${qr.material_requested}
- Cantidad: ${qr.quantity}
- Acabado superficial: ${qr.surface_finish || 'No especificado'}
- Tolerancias: ${qr.tolerances || 'No especificado'}

${servicesConfig}

Responde en formato JSON:
{
  "internalServices": [
    { "service": "mecanizado_cnc", "feasible": true, "estimated_days": 5 }
  ],
  "externalServices": [
    { "service": "anodizado", "material": "aluminio", "quantity": 100, "reason": "Acabado superficial solicitado" }
  ],
  "reasoning": "Explicación breve"
}`;

    const response = await withRateLimit(
      openaiLimiter,
      () => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      { priority: 7 } // Alta prioridad para análisis
    );

    const result = JSON.parse(response.choices[0].message.content!);

    log('debug', '🔍 Servicios identificados', result);

    // Actualizar quotation_request
    await supabase
      .from('quotation_requests')
      .update({
        internal_services: result.internalServices,
        external_services: result.externalServices,
      })
      .eq('id', quotationRequestId);

    // Si hay servicios externos, buscar proveedores
    if (result.externalServices.length > 0) {
      log('info', `📞 ${result.externalServices.length} servicios externos detectados`);
      await updateQuotationStatus(quotationRequestId, 'waiting_providers');
      await searchAndContactProviders(quotationRequestId, result.externalServices);
    } else {
      log('info', '✅ No se necesitan servicios externos');
      await updateQuotationStatus(quotationRequestId, 'ready_for_human');
      await notifyHumanReadyForQuote(quotationRequestId);
    }
  } catch (error: any) {
    log('error', '❌ Error identificando servicios externos', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * STEP 7: Search and Contact Providers
 * Busca proveedores y les envía solicitudes de cotización
 */
async function searchAndContactProviders(
  quotationRequestId: string,
  externalServices: Array<{
    service: string;
    material?: string;
    quantity?: number;
  }>
): Promise<void> {
  try {
    log(
      'info',
      `🔍 Buscando proveedores para ${externalServices.length} servicios...`
    );

    for (const service of externalServices) {
      // Buscar proveedores
      const providers = await findProviders({
        service: service.service,
        material: service.material,
        location: 'Madrid', // TODO: Hacer configurable
        radius: 50,
      });

      log(
        'info',
        `✅ Encontrados ${providers.total} proveedores para ${service.service}`
      );

      // Tomar los 3 mejores proveedores, priorizando los que tienen email
      const allProviders = [
        ...providers.fromDatabase,
        ...providers.fromGoogle,
      ];

      // Ordenar: primero los que tienen email, luego por rating
      const sortedProviders = allProviders.sort((a, b) => {
        // Prioridad 1: Tiene email
        const aHasEmail = !!(a as any).email;
        const bHasEmail = !!(b as any).email;
        if (aHasEmail && !bHasEmail) return -1;
        if (!aHasEmail && bHasEmail) return 1;

        // Prioridad 2: Rating más alto
        const aRating = (a as any).rating || (a as any).quality_rating || 0;
        const bRating = (b as any).rating || (b as any).quality_rating || 0;
        return bRating - aRating;
      });

      const topProviders = sortedProviders.slice(0, 3);

      // Contactar a cada proveedor
      for (const provider of topProviders) {
        await contactProvider(quotationRequestId, service, provider);
      }
    }

    log('info', '✅ Proveedores contactados');
  } catch (error: any) {
    log('error', '❌ Error buscando/contactando proveedores', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * STEP 8: Contact Individual Provider
 * Envía email a un proveedor específico
 */
async function contactProvider(
  quotationRequestId: string,
  service: any,
  provider: any
): Promise<void> {
  try {
    if (!provider.email && !provider.website) {
      log('warn', `⚠️ Proveedor ${provider.name} no tiene email, skip`);
      return;
    }

    log('info', `📧 Contactando proveedor: ${provider.name}`);

    // Generar email de solicitud de cotización
    const emailBody = await generateProviderQuoteEmail(service, provider);

    // Si tiene email directo, enviar
    let sentToEmail = provider.email;
    if (provider.email) {
      try {
        await sendEmail({
          to: provider.email,
          subject: `Solicitud de cotización - ${service.service}`,
          body: emailBody,
          bodyHtml: emailBody,
        });
      } catch (error: any) {
        log('warn', `⚠️ No se pudo enviar email a ${provider.email}`, {
          error: error.message,
        });
        sentToEmail = null;
      }
    }

    // Crear registro de external_quotation
    await supabase.from('external_quotations').insert({
      quotation_request_id: quotationRequestId,
      provider_name: provider.name,
      provider_email: provider.email || null,
      provider_phone: provider.phone || null,
      provider_source: provider.googlePlaceId
        ? 'google_places'
        : 'knowledge_base',
      service_type: service.service,
      service_details: service,
      status: sentToEmail ? 'sent' : 'pending',
      email_sent_at: sentToEmail ? new Date() : null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    });

    log('info', `✅ Cotización registrada para ${provider.name}`);
  } catch (error: any) {
    log('error', `❌ Error contactando proveedor ${provider.name}`, {
      error: error.message,
    });
  }
}

/**
 * STEP 9: Generate Provider Quote Email
 * Genera email profesional para pedir cotización a proveedor
 */
async function generateProviderQuoteEmail(
  service: any,
  provider: any
): Promise<string> {
  const prompt = `Genera un email profesional para solicitar cotización a un proveedor externo.

DATOS:
- Proveedor: ${provider.name}
- Servicio: ${service.service}
- Material: ${service.material || 'N/A'}
- Cantidad: ${service.quantity || 'N/A'}

REQUISITOS DEL EMAIL:
- Presentar a Arkcutt como empresa de mecanizado CNC
- Explicar que necesitamos este servicio para un cliente
- Pedir cotización con precio y tiempo de entrega
- Ser profesional y directo
- Incluir datos de contacto de Arkcutt
- Firma: "Equipo Arkcutt - Mecanizado CNC"

Responde SOLO con el HTML del email.`;

  const response = await withRateLimit(
    openaiLimiter,
    () => openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
    { priority: 6 } // Prioridad media-alta para generación de emails
  );

  return response.choices[0].message.content!;
}

/**
 * STEP 10: Notify Human Ready for Quote
 * Notifica al humano que toda la información está lista
 */
async function notifyHumanReadyForQuote(
  quotationRequestId: string
): Promise<void> {
  try {
    log('info', `🎯 Notificando humano: quotation lista para procesar`);

    // TODO: Implementar notificación real (email, Slack, dashboard)
    // Por ahora solo log

    const { data: qr } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('id', quotationRequestId)
      .single();

    log('info', '✅ QUOTATION READY FOR HUMAN', {
      id: quotationRequestId,
      customer: qr?.customer_email,
      description: qr?.parts_description,
    });

    // Actualizar estado
    await updateQuotationStatus(quotationRequestId, 'ready_for_human');
  } catch (error: any) {
    log('error', '❌ Error notificando humano', { error: error.message });
  }
}

/**
 * HELPER: Escalate to Human
 * Escala un email para revisión manual
 */
async function escalateToHuman(email: any, classification: any): Promise<void> {
  try {
    log('info', `⚠️ Escalando email de ${email.from} a humano`);

    // TODO: Implementar notificación real (Slack, dashboard alert)
    // Por ahora solo registrar en BD

    await supabase.from('quotation_requests').insert({
      external_id: email.id,
      status: 'pending',
      customer_email: extractEmailAddress(email.from),
      conversation_thread_id: email.threadId,
      agent_analysis: {
        classification: classification.emailType,
        confidence: classification.confidence,
        reason: 'escalated_to_human',
        details: classification.actionRecommended,
      },
    });

    log('info', '✅ Email escalado y registrado');
  } catch (error: any) {
    log('error', '❌ Error escalando a humano', { error: error.message });
  }
}

/**
 * HELPER: Update Quotation Status
 */
async function updateQuotationStatus(
  quotationRequestId: string,
  status: string
): Promise<void> {
  await supabase
    .from('quotation_requests')
    .update({ status, last_interaction: new Date() })
    .eq('id', quotationRequestId);

  log('debug', `📊 Estado actualizado: ${status}`);
}

/**
 * HELPER: Extract Email Address
 * Extrae email limpio de "Name <email@domain.com>"
 */
function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from;
}

/**
 * PUBLIC API
 * Funciones exportadas para el coordinador de quotations
 */
export const quotationCoordinator = {
  processNewEmails,
  analyzeAndRequestMissingInfo,
  identifyExternalServices,
  searchAndContactProviders,
  notifyHumanReadyForQuote,
};
