/**
 * Check all quotations created today
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkToday() {
  console.log('🔍 Checking all quotations from today...\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: quotations, error: qError } = await supabase
    .from('quotation_requests')
    .select('id, customer_email, status, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (qError) {
    console.error('Error:', qError);
    return;
  }

  console.log(`Found ${quotations.length} quotations today\n`);

  for (const qr of quotations) {
    const { data: interactions } = await supabase
      .from('quotation_interactions')
      .select('type, direction, created_at')
      .eq('quotation_request_id', qr.id)
      .order('created_at', { ascending: true });

    console.log(`${qr.customer_email} - ${interactions.length} interactions`);
    interactions.forEach(int => {
      console.log(`  ✓ ${int.type} (${int.direction}) at ${new Date(int.created_at).toLocaleTimeString()}`);
    });
    console.log('');
  }
}

checkToday();
