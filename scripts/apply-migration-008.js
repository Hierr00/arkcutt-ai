/**
 * Aplicar migración 008: Fix provider_contacts unique constraint
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('🔄 Aplicando migración 008...\n');

    const sql = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/008_fix_provider_contacts_unique.sql'),
      'utf8'
    );

    // Ejecutar usando SQL directo via RPC (si existe la función)
    // O manualmente en Supabase Dashboard
    console.log('📝 SQL a ejecutar:');
    console.log(sql);
    console.log('\n⚠️ Ejecuta este SQL manualmente en Supabase Dashboard > SQL Editor');
    console.log('\nO usa el Supabase CLI:');
    console.log('psql $DATABASE_URL -f supabase/migrations/008_fix_provider_contacts_unique.sql');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
