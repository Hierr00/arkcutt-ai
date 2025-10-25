/**
 * 🔄 REPROCESS SPECIFIC EMAIL
 * Vuelve a clasificar un email específico para testing
 */

// IMPORTANTE: Cargar .env PRIMERO antes de cualquier otro import
require('dotenv').config({ path: '.env.local' });

const { google } = require('googleapis');
const { classifyEmail } = require('../lib/guardrails/email-classifier.ts');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function reprocessEmail() {
  try {
    // ID del email de prueba
    const messageId = '199f8b983c2e03b7';

    console.log('📧 Obteniendo email de Gmail...\n');

    const details = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = details.data.payload.headers;
    const getHeader = (name) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('From');
    const subject = getHeader('Subject');

    // Extraer body
    let body = '';
    function extractBody(part) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        part.parts.forEach(extractBody);
      }
    }
    extractBody(details.data.payload);

    // Extraer attachments
    const attachments = [];
    function extractAttachments(part) {
      if (part.filename && part.body.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
        });
      }
      if (part.parts) {
        part.parts.forEach(extractAttachments);
      }
    }
    extractAttachments(details.data.payload);

    console.log('════════════════════════════════════════════════');
    console.log('📋 EMAIL INFO');
    console.log('════════════════════════════════════════════════');
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body.substring(0, 200)}...`);
    console.log(`Attachments: ${attachments.length}`);

    console.log('\n════════════════════════════════════════════════');
    console.log('🛡️ RECLASIFICANDO EMAIL...');
    console.log('════════════════════════════════════════════════\n');

    const classification = await classifyEmail({
      id: messageId + '-test',
      from,
      subject,
      body,
      attachments,
    });

    console.log(`Decision: ${classification.decision}`);
    console.log(`Confidence: ${Math.round(classification.confidence * 100)}%`);
    console.log(`Type: ${classification.emailType}`);
    console.log(`\nReasons:`);
    classification.reasons.forEach((r) => {
      console.log(`  - ${r.rule}: ${r.passed ? '✅' : '❌'} (${r.confidence ? Math.round(r.confidence * 100) + '%' : 'N/A'})`);
      if (r.details) {
        console.log(`    ${r.details}`);
      }
    });

    console.log('\n════════════════════════════════════════════════');
    if (classification.decision === 'handle') {
      console.log('✅ ¡ÉXITO! El email ahora sería MANEJADO por el agente');
    } else if (classification.decision === 'escalate') {
      console.log('⚠️ El email todavía se ESCALA a humano');
    } else {
      console.log('🗑️ El email sería IGNORADO');
    }
    console.log('════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

reprocessEmail();
