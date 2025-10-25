/**
 * Verificar procesamiento de PDFs en quotations
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPDFProcessing() {
  console.log('🔍 Verificando procesamiento de PDFs...\n');

  // Obtener quotations con adjuntos
  const { data: quotations } = await supabase
    .from('quotation_requests')
    .select('*')
    .not('attachments', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!quotations || quotations.length === 0) {
    console.log('❌ No se encontraron quotations con adjuntos\n');
    return;
  }

  console.log(`✅ Encontradas ${quotations.length} quotations con adjuntos\n`);

  for (const qr of quotations) {
    console.log('========================================');
    console.log(`Quotation ID: ${qr.id.substring(0, 8)}`);
    console.log(`Customer: ${qr.customer_email}`);
    console.log(`Status: ${qr.status}`);
    console.log(`Created: ${qr.created_at}`);
    console.log('');

    // Mostrar adjuntos
    console.log('📎 Adjuntos:');
    if (qr.attachments && Array.isArray(qr.attachments)) {
      qr.attachments.forEach((att, i) => {
        console.log(`  ${i + 1}. ${att.filename} (${att.mimeType})`);
        if (att.pdfData) {
          console.log(`     ✅ PDF procesado:`);
          console.log(`        - Páginas: ${att.pdfData.pageCount}`);
          console.log(`        - Confianza: ${att.pdfData.confidence}%`);
          if (att.pdfData.technicalInfo) {
            console.log(`        - Material: ${att.pdfData.technicalInfo.material || 'N/A'}`);
            console.log(`        - Cantidad: ${att.pdfData.technicalInfo.quantity || 'N/A'}`);
            console.log(`        - Dimensiones: ${att.pdfData.technicalInfo.dimensions?.join(', ') || 'N/A'}`);
            console.log(`        - Tolerancias: ${att.pdfData.technicalInfo.tolerances?.join(', ') || 'N/A'}`);
            console.log(`        - Acabado: ${att.pdfData.technicalInfo.surfaceFinish || 'N/A'}`);
            console.log(`        - Nombre pieza: ${att.pdfData.technicalInfo.partName || 'N/A'}`);
          }
        } else {
          console.log(`     ⚠️ PDF NO procesado o no es PDF`);
        }
      });
    } else {
      console.log('  Sin adjuntos válidos');
    }
    console.log('');

    // Mostrar información extraída
    console.log('📊 Información extraída:');
    console.log(`  Material: ${qr.material_requested || 'N/A'}`);
    console.log(`  Cantidad: ${qr.quantity || 'N/A'}`);
    console.log(`  Descripción: ${qr.parts_description || 'N/A'}`);
    console.log(`  Tolerancias: ${qr.tolerances || 'N/A'}`);
    console.log(`  Acabado: ${qr.surface_finish || 'N/A'}`);
    console.log('');

    // Mostrar agent_analysis
    if (qr.agent_analysis) {
      console.log('🤖 Análisis del agente:');
      if (qr.agent_analysis.pdfExtracted) {
        console.log('  ✅ Datos extraídos del PDF:');
        console.log(`     Confianza: ${qr.agent_analysis.pdfExtracted.pdfConfidence}%`);
        console.log(`     Material: ${qr.agent_analysis.pdfExtracted.material || 'N/A'}`);
        console.log(`     Cantidad: ${qr.agent_analysis.pdfExtracted.quantity || 'N/A'}`);
      } else {
        console.log('  ⚠️ No hay datos extraídos del PDF en agent_analysis');
      }
    }
    console.log('');

    // Mostrar servicios externos detectados
    if (qr.external_services && qr.external_services.length > 0) {
      console.log('🔧 Servicios externos detectados:');
      qr.external_services.forEach((service, i) => {
        console.log(`  ${i + 1}. ${service.service}`);
        console.log(`     Material: ${service.material || 'N/A'}`);
        console.log(`     Cantidad: ${service.quantity || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No se detectaron servicios externos');
    }
    console.log('');
  }
}

checkPDFProcessing();
