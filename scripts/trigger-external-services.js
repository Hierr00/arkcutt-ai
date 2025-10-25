/**
 * Script para ejecutar manualmente la detección de servicios externos
 * en un quotation específico
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { quotationCoordinator } = require('../lib/agents/quotation-coordinator.agent.ts');

const QUOTATION_ID = process.argv[2];

if (!QUOTATION_ID) {
  console.error('❌ Falta el ID del quotation');
  console.log('Uso: node scripts/trigger-external-services.js <quotation-id>');
  process.exit(1);
}

async function main() {
  try {
    console.log(`🔍 Ejecutando detección de servicios externos para: ${QUOTATION_ID}`);

    await quotationCoordinator.identifyExternalServices(QUOTATION_ID);

    console.log('✅ Detección completada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
