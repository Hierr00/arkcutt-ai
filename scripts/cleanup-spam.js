/**
 * Script para eliminar emails spam de la base de datos
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Dominios conocidos de spam
const SPAM_DOMAINS = [
  'substack.com',
  'revolut.com',
  'framer.com',
  'replit.com',
  'reflag.com',
  'spline.design',
  'noreply@',
  'no-reply@',
  'skool.com',
  'link.com',
  'mail.replit.com',
];

async function identifySpam() {
  console.log('🔍 Identificando emails spam...\n');

  // Obtener todos los quotations
  const { data: quotations, error } = await supabase
    .from('quotation_requests')
    .select('id, customer_email, agent_analysis, status, created_at');

  if (error) {
    console.error('❌ Error:', error);
    return null;
  }

  // Filtrar spam
  const spamQuotations = quotations.filter((q) => {
    // Criterio 1: Email de dominio spam
    const isSpamDomain = SPAM_DOMAINS.some((domain) =>
      q.customer_email?.toLowerCase().includes(domain)
    );

    // Criterio 2: Clasificado como spam o general_inquiry con baja confianza
    const isClassifiedSpam =
      q.agent_analysis?.classification === 'spam' ||
      q.agent_analysis?.classification === 'complaint' ||
      (q.agent_analysis?.classification === 'general_inquiry' &&
        q.agent_analysis?.confidence < 0.7);

    return isSpamDomain || isClassifiedSpam;
  });

  console.log(`📊 Total quotations: ${quotations.length}`);
  console.log(`🚫 Spam identificados: ${spamQuotations.length}`);
  console.log(`✅ Legítimos: ${quotations.length - spamQuotations.length}\n`);

  // Mostrar algunos ejemplos
  console.log('📧 Ejemplos de spam a eliminar:');
  console.log('━'.repeat(60));
  spamQuotations.slice(0, 10).forEach((q, i) => {
    console.log(`${i + 1}. ${q.customer_email}`);
    console.log(`   Status: ${q.status} | Classification: ${q.agent_analysis?.classification || 'N/A'}`);
    console.log(`   Creado: ${new Date(q.created_at).toLocaleString('es-ES')}`);
  });
  if (spamQuotations.length > 10) {
    console.log(`   ... y ${spamQuotations.length - 10} más`);
  }
  console.log('━'.repeat(60));

  return spamQuotations;
}

async function deleteSpam(spamQuotations) {
  console.log('\n🗑️  Eliminando spam de la base de datos...\n');

  const spamIds = spamQuotations.map((q) => q.id);

  // Eliminar en lotes de 100
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < spamIds.length; i += batchSize) {
    const batch = spamIds.slice(i, i + batchSize);

    const { error } = await supabase
      .from('quotation_requests')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`❌ Error eliminando lote ${i / batchSize + 1}:`, error.message);
    } else {
      deleted += batch.length;
      console.log(`✅ Eliminados ${deleted} / ${spamIds.length}`);
    }
  }

  console.log(`\n🎉 Limpieza completada: ${deleted} registros eliminados\n`);
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  console.log('🧹 LIMPIEZA DE EMAILS SPAM\n');
  console.log('Este script eliminará permanentemente los emails spam de la base de datos.\n');

  // Paso 1: Identificar spam
  const spamQuotations = await identifySpam();

  if (!spamQuotations || spamQuotations.length === 0) {
    console.log('✅ No hay spam para eliminar');
    return;
  }

  // Paso 2: Confirmar con el usuario
  console.log('\n⚠️  ADVERTENCIA: Esta acción NO se puede deshacer.\n');
  const answer = await promptUser(
    `¿Deseas eliminar ${spamQuotations.length} registros spam? (si/no): `
  );

  if (answer === 'si' || answer === 's' || answer === 'yes' || answer === 'y') {
    await deleteSpam(spamQuotations);
  } else {
    console.log('❌ Operación cancelada');
  }
}

main().catch(console.error);
