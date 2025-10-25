/**
 * 🔍 DEBUG: Check what's in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('🔍 Verificando datos en Supabase...\n');

  // 1. Ver quotation_requests
  const { data: quotations, error: qError } = await supabase
    .from('quotation_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (qError) {
    console.error('❌ Error:', qError);
    return;
  }

  console.log(`📊 Últimas ${quotations.length} quotation requests:\n`);

  quotations.forEach((q, i) => {
    console.log(`${i + 1}. ID: ${q.id.substring(0, 8)}...`);
    console.log(`   Email: ${q.customer_email}`);
    console.log(`   Status: ${q.status}`);
    console.log(`   Descripción: ${q.parts_description || 'N/A'}`);
    console.log(`   Material: ${q.material_requested || 'N/A'}`);
    console.log(`   Cantidad: ${q.quantity || 'N/A'}`);
    console.log(`   Missing info: ${q.missing_info ? q.missing_info.join(', ') : 'N/A'}`);
    console.log(`   Created: ${q.created_at}`);
    console.log('');
  });

  // 2. Ver guardrails_log
  const { data: logs, error: lError } = await supabase
    .from('guardrails_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (lError) {
    console.error('❌ Error:', lError);
    return;
  }

  console.log(`\n🛡️ Últimos ${logs.length} guardrails logs:\n`);

  logs.forEach((log, i) => {
    console.log(`${i + 1}. From: ${log.email_from}`);
    console.log(`   Subject: ${log.email_subject}`);
    console.log(`   Body preview: ${log.email_body ? log.email_body.substring(0, 100) : 'N/A'}...`);
    console.log(`   Decision: ${log.decision} (${Math.round(log.confidence * 100)}% confidence)`);
    console.log(`   Type: ${log.email_type}`);
    console.log('');
  });

  // 3. Ver interactions
  const { data: interactions, error: iError } = await supabase
    .from('quotation_interactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (iError) {
    console.error('❌ Error:', iError);
    return;
  }

  console.log(`\n💬 Últimas ${interactions.length} interacciones:\n`);

  interactions.forEach((int, i) => {
    console.log(`${i + 1}. Type: ${int.type}`);
    console.log(`   Subject: ${int.subject}`);
    console.log(`   Body preview: ${int.body ? int.body.substring(0, 100) : 'N/A'}...`);
    console.log('');
  });
}

checkData();
