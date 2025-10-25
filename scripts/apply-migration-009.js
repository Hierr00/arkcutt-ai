/**
 * Aplicar migración 009: Audit Logs System
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function main() {
  try {
    console.log('🔄 Aplicando migración 009: Audit Logs System\n');

    const sql = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/009_create_audit_logs.sql'),
      'utf8'
    );

    console.log('📝 SQL a ejecutar:');
    console.log('=====================================');
    console.log(sql.substring(0, 500) + '...\n');
    console.log('=====================================\n');

    console.log('⚠️  Ejecuta este SQL en Supabase Dashboard:');
    console.log('   1. Ve a tu proyecto en Supabase');
    console.log('   2. Abre SQL Editor');
    console.log('   3. Copia y pega el contenido de:');
    console.log('      supabase/migrations/009_create_audit_logs.sql');
    console.log('   4. Ejecuta el query\n');

    console.log('✅ Esto creará:');
    console.log('   - Tabla audit_logs con índices optimizados');
    console.log('   - RLS policies para seguridad');
    console.log('   - Views para análisis (audit_logs_summary, recent_errors)');
    console.log('   - Función de limpieza automática de logs antiguos\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
