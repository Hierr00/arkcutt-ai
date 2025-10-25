/**
 * Script para probar extracción de emails de websites
 */

require('dotenv').config({ path: '.env.local' });
const { extractEmailFromWebsite } = require('../lib/services/email-extractor.service.ts');

// URLs de prueba - usar websites reales de empresas españolas
const testWebsites = [
  'https://www.metalurgia.com', // Ejemplo genérico
  'https://httpbin.org/html', // Para testing
];

async function main() {
  console.log('🧪 Probando extracción de emails...\n');

  for (const website of testWebsites) {
    console.log(`\n🔍 Probando: ${website}`);
    console.log('─'.repeat(60));

    try {
      const email = await extractEmailFromWebsite(website);

      if (email) {
        console.log(`✅ Email encontrado: ${email}`);
      } else {
        console.log('❌ No se encontró email');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n✅ Pruebas completadas');
}

main();
