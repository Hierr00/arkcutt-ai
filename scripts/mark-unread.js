/**
 * 📬 MARK TEST EMAILS AS UNREAD
 * Marca los emails de prueba como no leídos para reprocesarlos
 */

require('dotenv').config({ path: '.env.local' });

const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function markAsUnread() {
  console.log('📬 Marcando emails de prueba como NO LEÍDOS...\n');

  const testEmailIds = [
    '199f8b983c2e03b7', // "Solicitud de presupuesto - 100 piezas de aluminio"
    '199f89a11f9025ac', // "Solicitud de presupuesto - 100 piezas aluminio"
  ];

  for (const emailId of testEmailIds) {
    try {
      // Obtener info del email
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full',
      });

      const headers = details.data.payload.headers;
      const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';

      console.log(`📧 ${subject}`);
      console.log(`   ID: ${emailId}`);

      // Marcar como no leído (añadir label UNREAD)
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });

      console.log(`   ✅ Marcado como NO LEÍDO\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log('════════════════════════════════════════════════');
  console.log('✅ Emails marcados como NO LEÍDOS!');
  console.log('════════════════════════════════════════════════\n');
  console.log('📝 Siguiente paso:');
  console.log('   Ejecuta: curl -X POST http://localhost:3001/api/cron/process-emails?secret=arkcutt-dev-secret-2025');
  console.log('');
}

markAsUnread();
