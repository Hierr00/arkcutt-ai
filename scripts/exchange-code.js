/**
 * 🔄 EXCHANGE CODE FOR REFRESH TOKEN
 * Intercambia el authorization code por un refresh token
 */

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';

// El código de autorización que obtuviste
const CODE = '4/0AVGzR1CH05l82AZBRiWk4ST1ABthmBcZ7jHHJ7Tw5HhCkXxAmsLCvwQ4m2Wviq--PBkviw';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function exchangeCode() {
  try {
    console.log('🔄 Intercambiando código por refresh token...\n');

    const { tokens } = await oauth2Client.getToken(CODE);

    if (!tokens.refresh_token) {
      console.error('❌ Error: No se obtuvo refresh_token');
      console.error('El código puede haber expirado o ya fue usado.');
      console.error('\nPor favor:');
      console.error('1. Ve a: https://myaccount.google.com/permissions');
      console.error('2. Revoca el acceso a "Arkcutt AI Agent"');
      console.error('3. Ejecuta: npm run setup:gmail');
      console.error('4. Obtén un nuevo código\n');
      return;
    }

    console.log('✅ ¡Refresh token obtenido exitosamente!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Copia esta línea y reemplázala en tu .env.local:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔒 Guarda este token de forma segura.\n');
    console.log('✅ Luego reinicia el servidor: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error intercambiando código:', error.message);
    console.error('\n💡 Razones comunes:');
    console.error('1. El código ya expiró (válido ~10 minutos)');
    console.error('2. El código ya fue usado anteriormente');
    console.error('3. CLIENT_ID o CLIENT_SECRET incorrectos\n');
    console.error('Solución:');
    console.error('1. Ejecuta: npm run setup:gmail');
    console.error('2. Obtén un código NUEVO');
    console.error('3. Usa ese código inmediatamente\n');
  }
}

exchangeCode();
