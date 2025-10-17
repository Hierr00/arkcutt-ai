/**
 * 🧪 SETUP PARA TESTS
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';

// Setup global antes de todos los tests
beforeAll(async () => {
  console.log('🧪 Starting test suite...');

  // Configurar variables de entorno para tests
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

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
  // Reset de estado si es necesario
});

// Mock de funciones externas si es necesario
// (por ejemplo, llamadas a OpenAI en tests unitarios)
export const mockOpenAI = () => {
  // Mock implementation
};

export const mockSupabase = () => {
  // Mock implementation
};
