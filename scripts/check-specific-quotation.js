/**
 * Verificar quotation específica con PDF
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSpecificQuotation() {
  const quotationId = 'cb3e5c59-db75-4788-9531-86644f523df6';

  console.log(`🔍 Verificando quotation: ${quotationId}\n`);

  const { data: qr, error } = await supabase
    .from('quotation_requests')
    .select('*')
    .eq('id', quotationId)
    .single();

  if (error || !qr) {
    console.log('❌ Error obteniendo quotation:', error?.message);
    return;
  }

  console.log('========================================');
  console.log(`Quotation ID: ${qr.id}`);
  console.log(`Customer: ${qr.customer_email}`);
  console.log(`Status: ${qr.status}`);
  console.log(`Created: ${qr.created_at}`);
  console.log('');

  console.log('📊 Información extraída:');
  console.log(`  Customer Name: ${qr.customer_name || 'N/A'}`);
  console.log(`  Company: ${qr.customer_company || 'N/A'}`);
  console.log(`  Material: ${qr.material_requested || 'N/A'}`);
  console.log(`  Cantidad: ${qr.quantity || 'N/A'}`);
  console.log(`  Descripción: ${qr.parts_description || 'N/A'}`);
  console.log(`  Tolerancias: ${qr.tolerances || 'N/A'}`);
  console.log(`  Acabado: ${qr.surface_finish || 'N/A'}`);
  console.log(`  Missing info: ${qr.missing_info?.join(', ') || 'none'}`);
  console.log('');

  // Mostrar adjuntos completos
  console.log('📎 Adjuntos (JSON completo):');
  if (qr.attachments) {
    console.log(JSON.stringify(qr.attachments, null, 2));
  } else {
    console.log('  Sin adjuntos');
  }
  console.log('');

  // Mostrar agent_analysis completo
  console.log('🤖 Agent Analysis (JSON completo):');
  if (qr.agent_analysis) {
    console.log(JSON.stringify(qr.agent_analysis, null, 2));
  } else {
    console.log('  Sin análisis');
  }
  console.log('');

  // Mostrar servicios externos
  console.log('🔧 Servicios externos:');
  if (qr.external_services) {
    console.log(JSON.stringify(qr.external_services, null, 2));
  } else {
    console.log('  Sin servicios externos');
  }
  console.log('');

  // Obtener interacciones
  const { data: interactions } = await supabase
    .from('quotation_interactions')
    .select('*')
    .eq('quotation_request_id', quotationId)
    .order('created_at', { ascending: true });

  console.log(`💬 Interacciones: ${interactions?.length || 0}`);
  if (interactions && interactions.length > 0) {
    interactions.forEach((int, i) => {
      console.log(`\n  ${i + 1}. ${int.type} (${int.direction})`);
      console.log(`     Subject: ${int.subject || 'N/A'}`);
      console.log(`     Created: ${int.created_at}`);
      if (int.attachments) {
        console.log(`     Attachments: ${JSON.stringify(int.attachments, null, 2)}`);
      }
    });
  }
  console.log('');

  // Obtener RFQs externos
  const { data: rfqs } = await supabase
    .from('external_quotations')
    .select('*')
    .eq('quotation_request_id', quotationId);

  console.log(`📞 External Quotations: ${rfqs?.length || 0}`);
  if (rfqs && rfqs.length > 0) {
    rfqs.forEach((rfq, i) => {
      console.log(`  ${i + 1}. ${rfq.provider_name}`);
      console.log(`     Service: ${rfq.service_type}`);
      console.log(`     Status: ${rfq.status}`);
      console.log(`     Email: ${rfq.provider_email || 'N/A'}`);
      console.log(`     Email sent: ${rfq.email_sent_at || 'No'}`);
    });
  }
}

checkSpecificQuotation();
