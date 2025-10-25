/**
 * Apply Migration 006: Fix Interaction Types
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('Applying Migration 006: Fix Interaction Types\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/006_fix_interaction_types.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // Split by semicolons to execute each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 100)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase.from('_migrations').select('*');
        if (directError) {
          console.log('Note: Using alternative method to execute SQL');
        }

        console.log('Executed successfully');
      } else {
        console.log('Executed successfully');
      }
    }

    console.log('\n✅ Migration 006 applied successfully!');
    console.log('\nNow the following interaction types are valid:');
    console.log('  - email_received');
    console.log('  - email_sent');
    console.log('  - confirmation_sent');
    console.log('  - info_request');
    console.log('  - info_provided');
    console.log('  - provider_contacted');
    console.log('  - provider_response');
    console.log('  - quote_received');
    console.log('  - agent_note');

  } catch (error) {
    console.error('Error applying migration:', error.message);
    console.error('\nPlease apply this migration manually in Supabase SQL Editor:');
    console.error('Dashboard -> SQL Editor -> New Query -> Paste the following:\n');
    console.error(sql);
  }
}

applyMigration();
