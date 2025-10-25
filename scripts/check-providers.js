/**
 * Script para verificar proveedores en Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('🔍 Consultando providers...\n');

    const { data, error } = await supabase
      .from('provider_contacts')
      .select('*')
      .contains('services', ['anodizado'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log('Intentando sin filtro...');
      const { data: allData, error: allError } = await supabase
        .from('provider_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (allError) throw allError;

      console.log(`✅ Encontrados ${allData.length} providers (todos):\n`);

      allData.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Email: ${p.email || 'N/A'}`);
        console.log(`   Phone: ${p.phone || 'N/A'}`);
        console.log(`   Website: ${p.website || 'N/A'}`);
        console.log(`   Services: ${JSON.stringify(p.services)}`);
        console.log(`   Active: ${p.is_active}`);
        console.log('');
      });
      return;
    }

    console.log(`✅ Encontrados ${data.length} providers de anodizado:\n`);

    data.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Email: ${p.email || 'N/A'}`);
      console.log(`   Phone: ${p.phone || 'N/A'}`);
      console.log(`   Services: ${JSON.stringify(p.services)}`);
      console.log(`   Active: ${p.active}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
