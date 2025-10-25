/**
 * 🔍 CHECK TEST EMAILS SPECIFICALLY
 * Busca los datos específicos de los emails de prueba
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTestEmails() {
  console.log('🔍 Buscando datos de emails de prueba...\n');

  const testEmail = 'ivan.hierro@alumni.mondragon.edu';

  // 1. Buscar en quotation_requests
  console.log('════════════════════════════════════════════════');
  console.log('📊 QUOTATION REQUESTS');
  console.log('════════════════════════════════════════════════\n');

  const { data: quotations, error: qError } = await supabase
    .from('quotation_requests')
    .select('*')
    .eq('customer_email', testEmail)
    .order('created_at', { ascending: false });

  if (qError) {
    console.error('❌ Error:', qError.message);
  } else if (quotations.length === 0) {
    console.log(`❌ No se encontraron quotation_requests para ${testEmail}\n`);
  } else {
    console.log(`✅ Encontradas ${quotations.length} quotation requests:\n`);
    quotations.forEach((q, i) => {
      console.log(`${i + 1}. ID: ${q.id.substring(0, 8)}...`);
      console.log(`   Status: ${q.status}`);
      console.log(`   Parts description: ${q.parts_description || 'N/A'}`);
      console.log(`   Material: ${q.material_requested || 'N/A'}`);
      console.log(`   Quantity: ${q.quantity || 'N/A'}`);
      console.log(`   Missing info: ${q.missing_info ? q.missing_info.join(', ') : 'N/A'}`);
      console.log(`   Created: ${q.created_at}`);
      console.log('');
    });
  }

  // 2. Buscar en guardrails_log
  console.log('════════════════════════════════════════════════');
  console.log('🛡️ GUARDRAILS LOG');
  console.log('════════════════════════════════════════════════\n');

  const { data: logs, error: lError } = await supabase
    .from('guardrails_log')
    .select('*')
    .ilike('email_from', `%${testEmail}%`)
    .order('created_at', { ascending: false });

  if (lError) {
    console.error('❌ Error:', lError.message);
  } else if (logs.length === 0) {
    console.log(`❌ No se encontraron guardrails_log para ${testEmail}\n`);
  } else {
    console.log(`✅ Encontrados ${logs.length} guardrails logs:\n`);
    logs.forEach((log, i) => {
      console.log(`${i + 1}. Subject: ${log.email_subject}`);
      console.log(`   Decision: ${log.decision} (${Math.round(log.confidence * 100)}% confidence)`);
      console.log(`   Type: ${log.email_type}`);
      console.log(`   Email ID: ${log.email_id}`);
      console.log(`   Reasons:`);
      log.reasons.forEach((r) => {
        console.log(`     - ${r.rule}: ${r.passed ? '✅' : '❌'} (${r.confidence ? Math.round(r.confidence * 100) + '%' : 'N/A'})`);
      });
      console.log('');
    });
  }

  // 3. Buscar en quotation_interactions
  console.log('════════════════════════════════════════════════');
  console.log('💬 QUOTATION INTERACTIONS');
  console.log('════════════════════════════════════════════════\n');

  if (quotations && quotations.length > 0) {
    for (const quot of quotations) {
      const { data: interactions, error: iError } = await supabase
        .from('quotation_interactions')
        .select('*')
        .eq('quotation_id', quot.id)
        .order('created_at', { ascending: false });

      if (!iError && interactions.length > 0) {
        console.log(`✅ ${interactions.length} interactions para quotation ${quot.id.substring(0, 8)}:\n`);
        interactions.forEach((int, i) => {
          console.log(`${i + 1}. Type: ${int.type}`);
          console.log(`   Subject: ${int.subject}`);
          console.log(`   Body: ${int.body ? int.body.substring(0, 200) : 'N/A'}...`);
          console.log('');
        });
      }
    }
  }
}

checkTestEmails();
