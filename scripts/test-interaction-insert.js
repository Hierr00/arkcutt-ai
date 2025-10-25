/**
 * Test if we can insert a confirmation_sent interaction
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
  console.log('🧪 Testing confirmation_sent interaction insert...\n');

  // First, get a quotation_request ID
  const { data: quotations, error: qError } = await supabase
    .from('quotation_requests')
    .select('id')
    .limit(1);

  if (qError || !quotations || quotations.length === 0) {
    console.error('❌ No quotations found:', qError);
    return;
  }

  const quotationId = quotations[0].id;
  console.log(`📋 Using quotation ID: ${quotationId}\n`);

  // Try to insert a test interaction
  const { data, error } = await supabase
    .from('quotation_interactions')
    .insert({
      quotation_request_id: quotationId,
      type: 'confirmation_sent',
      direction: 'outbound',
      subject: 'Test confirmation',
      body: 'This is a test confirmation email',
      agent_intent: 'confirm_receipt',
    })
    .select();

  if (error) {
    console.error('❌ Error inserting interaction:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Successfully inserted interaction!');
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

testInsert();
