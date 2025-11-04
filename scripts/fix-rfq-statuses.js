/**
 * Script para corregir statuses de quotations que tienen RFQs enviados
 * pero no están en status "waiting_providers"
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRFQStatuses() {
  console.log('🔧 Corrigiendo statuses de quotations con RFQs...\n');

  // 1. Obtener todos los quotations con external_quotations
  const { data: quotationsWithRFQs, error } = await supabase
    .from('external_quotations')
    .select('quotation_request_id, quotation_requests(id, status)')
    .eq('status', 'sent'); // Solo RFQs que se enviaron

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // 2. Filtrar los que NO están en waiting_providers
  const toFix = quotationsWithRFQs.filter(
    (rfq) =>
      rfq.quotation_requests &&
      rfq.quotation_requests.status !== 'waiting_providers' &&
      rfq.quotation_requests.status !== 'quoted' // No tocar los que ya tienen cotización
  );

  // Eliminar duplicados
  const uniqueQuotations = Array.from(
    new Map(
      toFix.map((rfq) => [rfq.quotation_request_id, rfq.quotation_requests])
    ).values()
  );

  console.log(`📊 Quotations con RFQs enviados: ${quotationsWithRFQs.length}`);
  console.log(
    `🔧 Quotations a corregir: ${uniqueQuotations.length}\n`
  );

  if (uniqueQuotations.length === 0) {
    console.log('✅ No hay quotations que corregir');
    return;
  }

  // 3. Mostrar detalles
  console.log('Quotations a actualizar:');
  console.log('━'.repeat(60));
  uniqueQuotations.forEach((q, i) => {
    console.log(`${i + 1}. ID: ${q.id}`);
    console.log(`   Status actual: ${q.status} → waiting_providers`);
  });
  console.log('━'.repeat(60));

  // 4. Actualizar en batch
  const ids = uniqueQuotations.map((q) => q.id);

  const { error: updateError } = await supabase
    .from('quotation_requests')
    .update({ status: 'waiting_providers', updated_at: new Date() })
    .in('id', ids);

  if (updateError) {
    console.error('❌ Error actualizando:', updateError.message);
    return;
  }

  console.log(`\n✅ ${ids.length} quotations actualizados a "waiting_providers"\n`);
}

fixRFQStatuses().catch(console.error);
