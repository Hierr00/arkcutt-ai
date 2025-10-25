
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  '603832910385-t2qnja2b2qcl0ef0f5pmo6hv64klgvqm.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/api/auth/gmail/callback'
);

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
  ],
});

console.log('Autoriza esta app visitando esta URL:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Ingresa el código de la URL de callback: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\n✅ REFRESH TOKEN:');
  console.log(tokens.refresh_token);
  console.log('\nGuarda esto en tu .env como GMAIL_REFRESH_TOKEN');
  rl.close();
});
