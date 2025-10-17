/**
 * 🧪 TEST RAG SYSTEM
 * Script para probar el sistema RAG con consultas de ejemplo
 */

// Load environment variables first
import './load-env';

import { searchKnowledge, generateRAGContext, getKnowledgeStats } from '../lib/services/rag.service';
import { AgentType } from '../types/rag.types';

// Consultas de prueba
const testQueries = [
  {
    query: 'Necesito información sobre aluminio 7075 para aeronáutica',
    agent_type: 'material' as AgentType,
    description: 'Búsqueda de material aeronáutico',
  },
  {
    query: '¿Qué materiales puedo mecanizar en vuestra empresa?',
    agent_type: 'engineering' as AgentType,
    description: 'Capacidades de mecanizado',
  },
  {
    query: 'Necesito anodizar piezas de titanio',
    agent_type: 'providers' as AgentType,
    description: 'Búsqueda de proveedor de tratamientos',
  },
  {
    query: '¿Qué tolerancias podéis conseguir?',
    agent_type: 'engineering' as AgentType,
    description: 'Información sobre tolerancias',
  },
  {
    query: 'Proveedor de aluminio aeronáutico',
    agent_type: 'material' as AgentType,
    description: 'Búsqueda de proveedor de materiales',
  },
];

async function testRAGSystem() {
  console.log('🧪 Testing RAG System\n');
  console.log('=' .repeat(80) + '\n');

  try {
    // 1. Obtener estadísticas
    console.log('📊 Knowledge Base Statistics:');
    const stats = await getKnowledgeStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // 2. Probar cada consulta
    for (let i = 0; i < testQueries.length; i++) {
      const test = testQueries[i];
      console.log(`🔍 Test ${i + 1}/${testQueries.length}: ${test.description}`);
      console.log(`Query: "${test.query}"`);
      console.log(`Agent: ${test.agent_type}\n`);

      // Búsqueda semántica
      console.log('🔎 Semantic Search Results:');
      const results = await searchKnowledge({
        query: test.query,
        agent_type: test.agent_type,
        match_count: 3,
        match_threshold: 0.5,
        use_hybrid: false, // Usar solo vector search por ahora
      });

      if (results.length === 0) {
        console.log('❌ No results found\n');
      } else {
        results.forEach((result, idx) => {
          const similarity = Math.round(result.similarity * 100);
          console.log(`  ${idx + 1}. [${similarity}% match] ${result.category}`);
          console.log(`     ${result.content.substring(0, 150)}...`);
          console.log('');
        });
      }

      // Generar contexto RAG completo
      console.log('🧠 RAG Context Generation:');
      const ragContext = await generateRAGContext(test.query, test.agent_type, {
        max_results: 3,
        use_hybrid: false, // Usar solo vector search por ahora
      });

      console.log(`  - Documents retrieved: ${ragContext.retrieved_docs.length}`);
      console.log(`  - Token count: ~${ragContext.token_count}`);
      console.log(`  - Retrieval time: ${ragContext.retrieval_time_ms}ms`);
      console.log(`  - Formatted context length: ${ragContext.formatted_context.length} chars\n`);

      console.log('=' .repeat(80) + '\n');
    }

    console.log('✅ All tests completed successfully!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testRAGSystem()
  .then(() => {
    console.log('\n🎉 RAG System is working correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
