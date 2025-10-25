/**
 * Script para probar el procesamiento de PDFs
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function testPDFProcessing() {
  console.log('🧪 Probando procesamiento de PDF...\n');

  // Verificar que existe el PDF de prueba
  const pdfPath = path.join(__dirname, '..', 'test-technical-drawing.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.log('❌ No existe el archivo test-technical-drawing.pdf');
    console.log('Ejecuta: node scripts/generate-test-pdf.js');
    return;
  }

  console.log(`✅ PDF encontrado: ${pdfPath}\n`);

  try {
    // Importar servicio (necesita ser dinámico por TypeScript)
    const { processPDF } = require('../lib/services/pdf-extractor.service.ts');

    // Leer PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`📄 Tamaño del PDF: ${pdfBuffer.length} bytes\n`);

    // Procesar PDF
    console.log('🔄 Procesando PDF...\n');
    const result = await processPDF(pdfBuffer);

    console.log('========================================');
    console.log('✅ PDF PROCESADO EXITOSAMENTE');
    console.log('========================================\n');

    console.log('📊 Resultados:');
    console.log(`  Páginas: ${result.pageCount}`);
    console.log(`  Confianza: ${result.confidence}%`);
    console.log(`  Caracteres extraídos: ${result.text.length}`);
    console.log('');

    console.log('🔧 Información técnica extraída:');
    console.log(`  Material: ${result.technicalInfo.material || 'N/A'}`);
    console.log(`  Cantidad: ${result.technicalInfo.quantity || 'N/A'}`);
    console.log(`  Nombre pieza: ${result.technicalInfo.partName || 'N/A'}`);
    console.log(`  Dimensiones: ${result.technicalInfo.dimensions?.join(', ') || 'N/A'}`);
    console.log(`  Tolerancias: ${result.technicalInfo.tolerances?.join(', ') || 'N/A'}`);
    console.log(`  Acabado superficial: ${result.technicalInfo.surfaceFinish || 'N/A'}`);
    console.log(`  Especificaciones: ${result.technicalInfo.specifications?.join(', ') || 'N/A'}`);
    console.log('');

    console.log('📄 Texto extraído (primeros 500 caracteres):');
    console.log(result.text.substring(0, 500));
    console.log('...\n');

    // Verificar si se detectó información clave
    const hasKeyInfo = result.technicalInfo.material ||
                       result.technicalInfo.quantity ||
                       result.technicalInfo.dimensions?.length > 0;

    if (hasKeyInfo) {
      console.log('✅ ÉXITO: Se extrajo información técnica del PDF');
    } else {
      console.log('⚠️ ADVERTENCIA: No se extrajo información técnica relevante');
    }

  } catch (error) {
    console.error('❌ ERROR procesando PDF:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

testPDFProcessing();
