/**
 * Check workflow execution status
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWorkflow() {
  console.log('Checking workflow execution...\n');

  // Get test quotation requests
  const { data: quotations } = await supabase
    .from('quotation_requests')
    .select('*')
    .eq('customer_email', 'ivan.hierro@alumni.mondragon.edu')
    .order('created_at', { ascending: false });

  if (!quotations || quotations.length === 0) {
    console.log('No quotation requests found for test email\n');
    return;
  }

  console.log(`Found ${quotations.length} quotation requests\n`);

  for (const qr of quotations) {
    console.log('========================================');
    console.log(`Quotation: ${qr.id.substring(0, 8)}`);
    console.log(`Status: ${qr.status}`);
    console.log(`Created: ${qr.created_at}`);
    console.log(`Missing info: ${qr.missing_info ? qr.missing_info.join(', ') : 'none'}`);
    console.log('');

    // Check interactions
    const { data: interactions } = await supabase
      .from('quotation_interactions')
      .select('*')
      .eq('quotation_request_id', qr.id)
      .order('created_at', { ascending: true });

    console.log(`Interactions: ${interactions?.length || 0}`);
    if (interactions && interactions.length > 0) {
      interactions.forEach((int, i) => {
        console.log(`  ${i + 1}. ${int.type} (${int.direction})`);
        console.log(`     Subject: ${int.subject || 'N/A'}`);
        console.log(`     Created: ${int.created_at}`);
      });
    }
    console.log('');

    // Check external quotations
    const { data: externals } = await supabase
      .from('external_quotations')
      .select('*')
      .eq('quotation_request_id', qr.id);

    console.log(`External Quotations: ${externals?.length || 0}`);
    if (externals && externals.length > 0) {
      externals.forEach((ext, i) => {
        console.log(`  ${i + 1}. ${ext.provider_name}`);
        console.log(`     Service: ${ext.service_type}`);
        console.log(`     Status: ${ext.status}`);
        console.log(`     Email sent: ${ext.email_sent_at || 'No'}`);
      });
    }
    console.log('');
  }
}

checkWorkflow();
