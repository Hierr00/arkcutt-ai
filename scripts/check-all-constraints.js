/**
 * Check ALL constraints on quotation_interactions table
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Force new connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
  }
);

async function checkAllConstraints() {
  console.log('🔍 Checking ALL constraints on quotation_interactions...\n');

  // Query directly
  const { data, error } = await supabase
    .from('quotation_interactions')
    .select('*')
    .limit(0);

  console.log('Table query result:', { error: error?.message || 'OK' });

  // Now try to get table definition
  console.log('\nTrying direct SQL query to information_schema...');
}

checkAllConstraints();
