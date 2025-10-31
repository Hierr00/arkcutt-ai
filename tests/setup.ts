/**
 * 🧪 SETUP PARA TESTS
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  const lines = envFile.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }

  console.log('✅ Environment variables loaded from .env.local');
} catch (error: any) {
  console.warn('⚠️ Could not load .env.local:', error.message);
  console.log('Tests will use existing environment variables');
}

// Import global mocks
import { setupGlobalMocks, resetGlobalMocks } from './mocks';

// Setup global antes de todos los tests
beforeAll(async () => {
  console.log('🧪 Starting test suite...\n');

  // Setup global mocks
  setupGlobalMocks();
  console.log('✅ Global mocks initialized\n');

  // Verificar variables críticas
  const requiredVars = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please ensure .env.local is configured properly');
    throw new Error('Missing required environment variables');
  }

  console.log('✅ All required environment variables present\n');

  // Aquí puedes agregar setup adicional:
  // - Conectar a base de datos de test
  // - Limpiar datos previos
  // - Crear fixtures
});

// Cleanup después de todos los tests
afterAll(async () => {
  console.log('🧪 Test suite completed');

  // Cleanup:
  // - Cerrar conexiones
  // - Limpiar datos de test
});

// Setup antes de cada test
beforeEach(() => {
  // Reset de estado y mocks
  resetGlobalMocks();
});

// Export mocks for use in tests
export * from './mocks';
