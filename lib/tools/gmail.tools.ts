/**
 * 📧 GMAIL INTEGRATION TOOLS
 * Herramientas para leer y enviar emails usando Gmail API
 */

import { google } from 'googleapis';
import { log } from '@/mastra';

// Configurar OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Set credentials (refresh token from setup)
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
    data?: string; // Base64 encoded
  }>;
  labels: string[];
}

/**
 * Tool 1: Read Unread Quotation Emails
 * Lee emails no leídos que podrían ser solicitudes de presupuesto
 */
export async function readUnreadQuotationEmails(): Promise<GmailMessage[]> {
  try {
    log('info', '📬 Leyendo emails no leídos de Gmail...');

    // Buscar emails no leídos en INBOX
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread label:INBOX', // Solo no leídos en inbox
      maxResults: 20,
    });

    const messages = response.data.messages || [];

    if (messages.length === 0) {
      log('info', '✅ No hay emails nuevos');
      return [];
    }

    log('info', `📧 Encontrados ${messages.length} emails no leídos`);

    // Obtener detalles de cada mensaje
    const fullMessages = await Promise.all(
      messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        return parseGmailMessage(details.data);
      })
    );

    return fullMessages;
  } catch (error: any) {
    log('error', '❌ Error leyendo emails de Gmail', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Tool 2: Send Email
 * Envía un email desde Gmail
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  replyToMessageId?: string; // Para responder a un email existente
  threadId?: string; // Para mantener conversación
  cc?: string[];
  bcc?: string[];
}

export async function sendEmail(input: SendEmailInput): Promise<{
  success: boolean;
  messageId: string;
}> {
  try {
    log('info', `📤 Enviando email a ${input.to}`);

    // Crear email en formato RFC 2822
    const lines = [];

    lines.push(`To: ${input.to}`);
    if (input.cc && input.cc.length > 0) {
      lines.push(`Cc: ${input.cc.join(', ')}`);
    }
    if (input.bcc && input.bcc.length > 0) {
      lines.push(`Bcc: ${input.bcc.join(', ')}`);
    }
    lines.push(`Subject: ${input.subject}`);
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('MIME-Version: 1.0');
    lines.push('');
    lines.push(input.bodyHtml || input.body);

    const message = lines.join('\r\n');

    // Encode en base64
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const requestBody: any = {
      raw: encodedMessage,
    };

    // Si es una respuesta, incluir threadId y headers
    if (input.threadId) {
      requestBody.threadId = input.threadId;
    }

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody,
    });

    log('info', `✅ Email enviado: ${response.data.id}`);

    return {
      success: true,
      messageId: response.data.id!,
    };
  } catch (error: any) {
    log('error', '❌ Error enviando email', { error: error.message });
    throw error;
  }
}

/**
 * Tool 3: Get Email Attachments
 * Descarga los adjuntos de un email
 */
export async function getEmailAttachments(
  messageId: string,
  attachmentIds: string[]
): Promise<
  Array<{
    filename: string;
    mimeType: string;
    data: Buffer;
  }>
> {
  try {
    log('info', `📎 Descargando ${attachmentIds.length} adjuntos`);

    const attachments = await Promise.all(
      attachmentIds.map(async (attachmentId) => {
        const response = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachmentId,
        });

        // Decodificar base64
        const data = Buffer.from(response.data.data!, 'base64');

        // Necesitamos obtener el filename del mensaje original
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const parsed = parseGmailMessage(message.data);
        const attachment = parsed.attachments.find(
          (a) => a.attachmentId === attachmentId
        );

        return {
          filename: attachment?.filename || 'attachment',
          mimeType: attachment?.mimeType || 'application/octet-stream',
          data,
        };
      })
    );

    log('info', `✅ ${attachments.length} adjuntos descargados`);

    return attachments;
  } catch (error: any) {
    log('error', '❌ Error descargando adjuntos', { error: error.message });
    throw error;
  }
}

/**
 * Tool 4: Process PDF Attachments
 * Descarga y procesa automáticamente PDFs adjuntos
 */
export interface ProcessedAttachment {
  filename: string;
  mimeType: string;
  size?: number;
  pdfData?: {
    text: string;
    pageCount: number;
    technicalInfo: {
      material?: string;
      quantity?: number;
      dimensions?: string[];
      tolerances?: string[];
      surfaceFinish?: string;
      partName?: string;
      specifications?: string[];
    };
    confidence: number;
  };
}

export async function processEmailPDFAttachments(
  messageId: string,
  attachments: GmailMessage['attachments']
): Promise<ProcessedAttachment[]> {
  try {
    // Importar servicio de procesamiento de PDFs
    const { processPDF } = await import('../services/pdf-extractor.service');

    log('info', `🔍 Procesando ${attachments.length} adjuntos...`);

    const processedAttachments: ProcessedAttachment[] = [];

    for (const attachment of attachments) {
      // Solo procesar PDFs
      if (attachment.mimeType !== 'application/pdf') {
        processedAttachments.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
        });
        continue;
      }

      try {
        log('info', `📄 Procesando PDF: ${attachment.filename}`);

        // Descargar el adjunto
        const attachmentData = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachment.attachmentId,
        });

        if (!attachmentData.data.data) {
          log('warn', `⚠️ No se pudo descargar el PDF: ${attachment.filename}`);
          processedAttachments.push({
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.size,
          });
          continue;
        }

        // Convertir de base64 a Buffer
        const pdfBuffer = Buffer.from(attachmentData.data.data, 'base64');

        // Procesar el PDF
        const pdfData = await processPDF(pdfBuffer);

        log('info', `✅ PDF procesado: ${attachment.filename}`, {
          pages: pdfData.pageCount,
          confidence: pdfData.confidence,
          hasTechnicalInfo: Object.keys(pdfData.technicalInfo).length > 0,
        });

        processedAttachments.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          pdfData,
        });
      } catch (error: any) {
        log('error', `❌ Error procesando PDF: ${attachment.filename}`, {
          error: error.message,
        });
        // Añadir sin datos de PDF si falla el procesamiento
        processedAttachments.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
        });
      }
    }

    return processedAttachments;
  } catch (error: any) {
    log('error', '❌ Error procesando adjuntos PDF', { error: error.message });
    throw error;
  }
}

/**
 * Tool 5: Mark Email as Read
 * Marca un email como leído
 */
export async function markEmailAsRead(messageId: string): Promise<void> {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });

    log('debug', `✅ Email ${messageId} marcado como leído`);
  } catch (error: any) {
    log('error', '❌ Error marcando email como leído', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Tool 6: Add Label to Email
 * Añade una etiqueta a un email (para organización)
 */
export async function addLabelToEmail(
  messageId: string,
  labelName: string
): Promise<void> {
  try {
    // Primero, obtener o crear la etiqueta
    const labelsResponse = await gmail.users.labels.list({
      userId: 'me',
    });

    let labelId = labelsResponse.data.labels?.find(
      (l) => l.name === labelName
    )?.id;

    // Si no existe, crearla
    if (!labelId) {
      const createResponse = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      labelId = createResponse.data.id!;
    }

    // Añadir etiqueta al email
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });

    log('debug', `✅ Etiqueta "${labelName}" añadida al email ${messageId}`);
  } catch (error: any) {
    log('error', '❌ Error añadiendo etiqueta', { error: error.message });
    throw error;
  }
}

/**
 * Helper: Parse Gmail Message
 * Parsea un mensaje de Gmail API a un formato más usable
 */
function parseGmailMessage(message: any): GmailMessage {
  const headers = message.payload.headers;

  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
      ?.value || '';

  const from = getHeader('From');
  const to = getHeader('To');
  const subject = getHeader('Subject');
  const date = new Date(getHeader('Date') || message.internalDate);

  // Extraer body (puede estar en diferentes formatos)
  let body = '';
  let bodyHtml = '';

  function extractBody(part: any) {
    if (part.mimeType === 'text/plain' && part.body.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body.data) {
      bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }

    if (part.parts) {
      part.parts.forEach(extractBody);
    }
  }

  extractBody(message.payload);

  // Extraer attachments
  const attachments: GmailMessage['attachments'] = [];

  function extractAttachments(part: any) {
    if (part.filename && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
      });
    }

    if (part.parts) {
      part.parts.forEach(extractAttachments);
    }
  }

  extractAttachments(message.payload);

  return {
    id: message.id,
    threadId: message.threadId,
    from,
    to,
    subject,
    body,
    bodyHtml,
    date,
    attachments,
    labels: message.labelIds || [],
  };
}

/**
 * Tool Schemas para Mastra
 */
export const gmailToolsSchema = {
  readUnreadQuotationEmails: {
    name: 'readUnreadQuotationEmails',
    description:
      'Lee los emails no leídos de Gmail que podrían ser solicitudes de presupuesto',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  sendEmail: {
    name: 'sendEmail',
    description: 'Envía un email desde Gmail',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Email del destinatario',
        },
        subject: {
          type: 'string',
          description: 'Asunto del email',
        },
        body: {
          type: 'string',
          description: 'Cuerpo del email',
        },
        threadId: {
          type: 'string',
          description:
            'ID del thread para responder a una conversación existente',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
};
