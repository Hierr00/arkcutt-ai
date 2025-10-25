/**
 * 🔐 GMAIL TOKEN GENERATOR
 * Script para obtener el refresh_token de Gmail OAuth2
 *
 * REQUISITOS:
 * 1. Haber creado OAuth2 credentials en Google Cloud Console
 * 2. Tener GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET
 *
 * USO:
 * node scripts/get-gmail-token.js
 */

const { google } = require('googleapis');
const readline = require('readline');

// Lee las variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET deben estar en .env.local');
  console.error('\nAñade estas variables a .env.local:');
  console.error('GMAIL_CLIENT_ID=tu-client-id.apps.googleusercontent.com');
  console.error('GMAIL_CLIENT_SECRET=GOCSPX-...');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes necesarios para Gmail
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Necesario para refresh token
  scope: SCOPES,
  prompt: 'consent', // Fuerza a mostrar pantalla de consentimiento
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔐 GMAIL OAUTH2 - OBTENER REFRESH TOKEN');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('PASO 1: Abre esta URL en tu navegador:\n');
console.log(authUrl);
console.log('\n');

console.log('PASO 2: Autoriza la aplicación (permite todos los permisos)');
console.log('\nPASO 3: Serás redirigido a una URL como:');
console.log('┌────────────────────────────────────────────────────────────────┐');
console.log('│ http://localhost:3000/api/auth/gmail/callback?code=4/0A...    │');
console.log('└────────────────────────────────────────────────────────────────┘');
console.log('\n⚠️  IMPORTANTE: La página mostrará error 404 (esto es NORMAL)');
console.log('   Solo necesitamos el código de la URL de arriba\n');

console.log('PASO 4: Copia TODO lo que viene después de "code="');
console.log('        Ejemplo completo: 4/0AanRRrtC1jxY3kZ9...');
console.log('        (Es una cadena larga de ~100 caracteres)\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('📋 Pega el código COMPLETO aquí: ', async (rawCode) => {
  // Limpiar el código (quitar espacios, saltos de línea, etc.)
  const code = rawCode.trim();

  // Validación básica
  if (!code || code.length < 20) {
    console.error('\n❌ Error: El código parece incorrecto (muy corto)');
    console.error('   Debe ser una cadena larga como: 4/0AanRRrtC1jxY3kZ9...');
    console.error('   Longitud mínima esperada: ~100 caracteres');
    console.error(`   Longitud recibida: ${code.length} caracteres`);
    console.error('\n💡 Asegúrate de copiar TODO el código, no solo una parte.\n');
    rl.close();
    return;
  }
  try {
    console.log('\n⏳ Obteniendo tokens...\n');

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('❌ Error: No se obtuvo refresh_token');
      console.error('Intenta revocar el acceso anterior en:');
      console.error('https://myaccount.google.com/permissions');
      console.error('Y ejecuta este script de nuevo.');
      rl.close();
      return;
    }

    console.log('✅ ¡Tokens obtenidos exitosamente!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Añade estas variables a tu .env.local:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔒 IMPORTANTE: Guarda este refresh_token de forma segura.');
    console.log('   NO lo subas a GitHub ni lo compartas.\n');

    console.log('✅ Una vez añadido a .env.local, reinicia el servidor:');
    console.log('   npm run dev\n');

    rl.close();
  } catch (error) {
    console.error('\n❌ Error obteniendo tokens:', error.message);
    console.error('\nVerifica que:');
    console.error('1. El código sea correcto (sin espacios extra)');
    console.error('2. El código no haya expirado (válido ~10 minutos)');
    console.error('3. GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET sean correctos\n');
    rl.close();
  }
});

// Manejo de Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n❌ Proceso cancelado');
  process.exit(0);
});
