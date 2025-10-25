/**
 * Script para limpiar datos de prueba
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('🧹 Limpiando datos de prueba...\n');

    // Limpiar external_quotations
    const { error: rfqError } = await supabase
      .from('external_quotations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (rfqError) throw rfqError;
    console.log('✅ external_quotations limpiada');

    // Limpiar provider_contacts
    const { error: provError } = await supabase
      .from('provider_contacts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (provError) throw provError;
    console.log('✅ provider_contacts limpiada');

    // Resetear external_services en el quotation de prueba
    const { error: updateError } = await supabase
      .from('quotation_requests')
      .update({
        external_services: [],
        internal_services: [],
        status: 'gathering_info'
      })
      .eq('id', '00bc774d-be57-4412-809b-829ddb1bdecc');

    if (updateError) throw updateError;
    console.log('✅ Quotation reseteado');

    console.log('\n✅ Limpieza completada - listo para probar workflow');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
