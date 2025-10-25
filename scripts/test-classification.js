/**
 * 🧪 TEST EMAIL CLASSIFICATION
 * Lee un email específico y muestra cómo lo clasifican los guardrails
 */

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function testClassification() {
  try {
    // ID del primer email de prueba
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
    const date = getHeader('Date');

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
    console.log(`Date: ${date}`);
    console.log(`\nBody (${body.length} chars):`);
    console.log(body.substring(0, 500));
    console.log(`\nAttachments: ${attachments.length}`);
    attachments.forEach((att, i) => {
      console.log(`  ${i + 1}. ${att.filename} (${att.mimeType})`);
    });

    // Ahora verificar en guardrails_log qué pasó
    console.log('\n════════════════════════════════════════════════');
    console.log('🛡️ GUARDRAILS LOG');
    console.log('════════════════════════════════════════════════\n');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: log, error } = await supabase
      .from('guardrails_log')
      .select('*')
      .eq('email_id', messageId)
      .single();

    if (error || !log) {
      console.log('❌ No se encontró en guardrails_log');
      console.log('   Esto significa que el email AÚN NO fue procesado\n');
    } else {
      console.log(`Decision: ${log.decision}`);
      console.log(`Confidence: ${Math.round(log.confidence * 100)}%`);
      console.log(`Type: ${log.email_type}`);
      console.log(`Action: ${log.action_taken}`);
      console.log(`\nReasons:`);
      log.reasons.forEach((r) => {
        console.log(`  - ${r.rule}: ${r.passed ? '✅' : '❌'} (${r.confidence ? Math.round(r.confidence * 100) + '%' : 'N/A'})`);
        if (r.details) {
          console.log(`    ${r.details}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testClassification();
