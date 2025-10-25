/**
 * Check interactions directly from Supabase
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInteractions() {
  console.log('🔍 Checking all interactions...\n');

  // Get all quotations from the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: quotations, error: qError } = await supabase
    .from('quotation_requests')
    .select('id, customer_email, status, created_at')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  if (qError) {
    console.error('Error fetching quotations:', qError);
    return;
  }

  console.log(`Found ${quotations.length} quotations in the last hour\n`);

  for (const qr of quotations) {
    console.log(`\n========================================`);
    console.log(`Quotation: ${qr.id.substring(0, 8)}`);
    console.log(`Customer: ${qr.customer_email}`);
    console.log(`Status: ${qr.status}`);
    console.log(`Created: ${qr.created_at}`);

    // Get interactions
    const { data: interactions, error: iError } = await supabase
      .from('quotation_interactions')
      .select('*')
      .eq('quotation_request_id', qr.id)
      .order('created_at', { ascending: true });

    if (iError) {
      console.error('Error fetching interactions:', iError);
      continue;
    }

    console.log(`\nInteractions: ${interactions.length}`);
    interactions.forEach((int, idx) => {
      console.log(`  ${idx + 1}. ${int.type} (${int.direction})`);
      console.log(`     Subject: ${int.subject || 'N/A'}`);
      console.log(`     Created: ${int.created_at}`);
    });

    // Get external quotations
    const { data: extQuotes, error: eqError } = await supabase
      .from('external_quotations')
      .select('*')
      .eq('quotation_request_id', qr.id);

    if (!eqError && extQuotes.length > 0) {
      console.log(`\nExternal Quotations: ${extQuotes.length}`);
      extQuotes.forEach((eq, idx) => {
        console.log(`  ${idx + 1}. ${eq.provider_name} - ${eq.service_type} (${eq.status})`);
      });
    }
  }

  console.log('\n========================================\n');
}

checkInteractions();
