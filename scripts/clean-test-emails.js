/**
 * 🧹 CLEAN TEST EMAIL DATA
 * Elimina los datos de los emails de prueba para poder reprocesarlos
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanTestEmails() {
  console.log('🧹 Limpiando datos de emails de prueba...\n');

  // IDs de los 2 emails de prueba
  const testEmailIds = [
    '199f8b983c2e03b7', // "Solicitud de presupuesto - 100 piezas de aluminio"
    '199f89a11f9025ac', // "Solicitud de presupuesto - 100 piezas aluminio"
  ];

  for (const emailId of testEmailIds) {
    console.log(`📧 Procesando email ID: ${emailId}`);

    // 1. Eliminar de guardrails_log
    const { data: guardData, error: guardError } = await supabase
      .from('guardrails_log')
      .delete()
      .eq('email_id', emailId)
      .select();

    if (guardError) {
      console.error(`   ❌ Error eliminando guardrails_log:`, guardError.message);
    } else {
      console.log(`   ✅ Eliminado de guardrails_log: ${guardData?.length || 0} registros`);
    }

    // 2. Buscar quotation_request relacionada
    const { data: quotations, error: quotError } = await supabase
      .from('quotation_requests')
      .select('id')
      .eq('customer_email', 'ivan.hierro@alumni.mondragon.edu')
      .order('created_at', { ascending: false });

    if (!quotError && quotations && quotations.length > 0) {
      console.log(`   📋 Encontradas ${quotations.length} quotation_requests para este cliente`);

      for (const quot of quotations) {
        // 2a. Eliminar interactions
        const { data: intData, error: intError } = await supabase
          .from('quotation_interactions')
          .delete()
          .eq('quotation_id', quot.id)
          .select();

        if (!intError) {
          console.log(`   ✅ Eliminadas ${intData?.length || 0} interactions para quotation ${quot.id.substring(0, 8)}`);
        }

        // 2b. Eliminar quotation
        const { error: delError } = await supabase
          .from('quotation_requests')
          .delete()
          .eq('id', quot.id);

        if (!delError) {
          console.log(`   ✅ Eliminada quotation_request ${quot.id.substring(0, 8)}`);
        }
      }
    }

    console.log('');
  }

  console.log('════════════════════════════════════════════════');
  console.log('✅ Limpieza completada!');
  console.log('════════════════════════════════════════════════\n');
  console.log('📝 Siguiente paso:');
  console.log('   1. Ve a Gmail: https://mail.google.com');
  console.log('   2. Busca los emails con subject "Solicitud de presupuesto"');
  console.log('   3. Márcalos como NO LEÍDOS (unread)');
  console.log('   4. Ejecuta: curl -X POST http://localhost:3001/api/cron/process-emails?secret=arkcutt-dev-secret-2025');
  console.log('');
}

cleanTestEmails();
