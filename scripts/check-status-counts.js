require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatusCounts() {
  const { data, error } = await supabase
    .from('quotation_requests')
    .select('id, status');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No quotations found in database');
    return;
  }

  console.log(`\n📊 Total quotation requests: ${data.length}\n`);

  const counts = {};
  data.forEach((q) => {
    counts[q.status] = (counts[q.status] || 0) + 1;
  });

  console.log('Status breakdown:');
  console.log('━'.repeat(40));
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status.padEnd(20)} ${count}`);
    });
  console.log('━'.repeat(40));
}

checkStatusCounts();
