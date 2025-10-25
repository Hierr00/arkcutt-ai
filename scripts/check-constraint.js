/**
 * Check current constraint on quotation_interactions table
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraint() {
  console.log('🔍 Checking constraints on quotation_interactions table...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'quotation_interactions'::regclass
  AND contype = 'c';
    `
  });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Constraints:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkConstraint();
