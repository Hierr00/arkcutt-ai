/**
 * Script para verificar RFQs directamente en Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('🔍 Consultando external_quotations...\n');

    const { data, error } = await supabase
      .from('external_quotations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    console.log(`✅ Encontrados ${data.length} RFQs:\n`);

    data.forEach((rfq, i) => {
      console.log(`${i + 1}. ${rfq.provider_name} - ${rfq.service_type}`);
      console.log(`   Status: ${rfq.status}`);
      console.log(`   Email: ${rfq.provider_email || 'N/A'}`);
      console.log(`   Quote request: ${rfq.quotation_request_id}`);
      console.log(`   Created: ${rfq.created_at}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
