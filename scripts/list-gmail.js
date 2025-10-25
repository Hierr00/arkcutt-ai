/**
 * 📧 LIST GMAIL MESSAGES
 * Muestra los últimos emails en Gmail (leídos y no leídos)
 */

const { google } = require('googleapis');
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

async function listEmails() {
  try {
    console.log('📧 Listando últimos emails en Gmail...\n');

    // Buscar todos los emails (leídos y no leídos)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
    });

    const messages = response.data.messages || [];

    console.log(`Total encontrados: ${messages.length}\n`);

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      const details = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = details.data.payload.headers;
      const getHeader = (name) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const from = getHeader('From');
      const subject = getHeader('Subject');
      const date = getHeader('Date');
      const isUnread = details.data.labelIds?.includes('UNREAD');

      console.log(`${i + 1}. ${isUnread ? '🔵 UNREAD' : '⚪ READ'}`);
      console.log(`   From: ${from}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Date: ${date}`);
      console.log(`   ID: ${msg.id}`);
      console.log('');
    }

    // Buscar específicamente emails con "presupuesto" en el asunto
    console.log('\n🔍 Emails con "presupuesto" en el asunto:\n');

    const quotationSearch = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:presupuesto',
      maxResults: 5,
    });

    const quotationMessages = quotationSearch.data.messages || [];

    if (quotationMessages.length === 0) {
      console.log('   ❌ No se encontraron emails con "presupuesto" en el asunto\n');
    } else {
      for (const msg of quotationMessages) {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = details.data.payload.headers;
        const getHeader = (name) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const from = getHeader('From');
        const subject = getHeader('Subject');
        const isUnread = details.data.labelIds?.includes('UNREAD');

        console.log(`   ${isUnread ? '🔵 UNREAD' : '⚪ READ'} - ${from}`);
        console.log(`   Subject: ${subject}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listEmails();
