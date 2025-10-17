/**
 * 🧪 RAG SERVICE TESTS
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  searchKnowledge,
  generateRAGContext,
  getKnowledgeStats,
} from '@/lib/services/rag.service';

describe('RAG Service', () => {
  beforeAll(() => {
    // Verificar configuración
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('SUPABASE_URL not configured');
    }
  });

  describe('searchKnowledge', () => {
    it('should find relevant documents for material query', async () => {
      const results = await searchKnowledge({
        query: 'aluminio 7075 aeronáutico',
        agent_type: 'material',
        match_count: 3,
        match_threshold: 0.5,
        use_hybrid: false,
      });

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // Verificar estructura del primer resultado
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('agent_type');
      expect(firstResult).toHaveProperty('category');
      expect(firstResult).toHaveProperty('content');
      expect(firstResult).toHaveProperty('similarity');

      // Verificar que la similitud está en rango válido
      expect(firstResult.similarity).toBeGreaterThanOrEqual(0);
      expect(firstResult.similarity).toBeLessThanOrEqual(1);

      // Verificar que encontró material relevante
      expect(firstResult.agent_type).toBe('material');
      expect(firstResult.content.toLowerCase()).toContain('7075');
    });

    it('should filter by agent type', async () => {
      const materialResults = await searchKnowledge({
        query: 'propiedades técnicas',
        agent_type: 'material',
        match_count: 5,
        match_threshold: 0.5,
      });

      const engineeringResults = await searchKnowledge({
        query: 'propiedades técnicas',
        agent_type: 'engineering',
        match_count: 5,
        match_threshold: 0.5,
      });

      // Verificar que filtró correctamente
      materialResults.forEach((result) => {
        expect(result.agent_type).toBe('material');
      });

      engineeringResults.forEach((result) => {
        expect(result.agent_type).toBe('engineering');
      });
    });

    it('should filter by category', async () => {
      const results = await searchKnowledge({
        query: 'proveedor de materiales',
        agent_type: 'material',
        category: 'suppliers',
        match_count: 3,
        match_threshold: 0.5,
      });

      // Todos los resultados deben ser de categoría suppliers
      results.forEach((result) => {
        expect(result.category).toBe('suppliers');
      });
    });

    it('should return empty array for irrelevant query', async () => {
      const results = await searchKnowledge({
        query: 'completely irrelevant gibberish xyzabc123',
        agent_type: 'material',
        match_count: 3,
        match_threshold: 0.8, // Threshold alto
      });

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);
    });

    it('should respect match_threshold', async () => {
      const lowThresholdResults = await searchKnowledge({
        query: 'material properties',
        agent_type: 'material',
        match_threshold: 0.3,
        match_count: 10,
      });

      const highThresholdResults = await searchKnowledge({
        query: 'material properties',
        agent_type: 'material',
        match_threshold: 0.7,
        match_count: 10,
      });

      // Con threshold más alto, debería haber menos resultados
      expect(highThresholdResults.length).toBeLessThanOrEqual(
        lowThresholdResults.length
      );

      // Todos los resultados con threshold alto deben tener similitud >= 0.7
      highThresholdResults.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should find provider information', async () => {
      const results = await searchKnowledge({
        query: 'anodizado de titanio',
        agent_type: 'providers',
        match_count: 3,
        match_threshold: 0.5,
      });

      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult.agent_type).toBe('providers');
      expect(
        firstResult.content.toLowerCase().includes('anodizado') ||
          firstResult.content.toLowerCase().includes('tratamiento')
      ).toBe(true);
    });
  });

  describe('generateRAGContext', () => {
    it('should generate formatted context for material query', async () => {
      const ragContext = await generateRAGContext(
        'aluminio 7075 para aeronáutica',
        'material',
        {
          max_results: 3,
          match_threshold: 0.6,
          use_hybrid: false,
          max_tokens: 1500,
        }
      );

      expect(ragContext).toHaveProperty('query');
      expect(ragContext).toHaveProperty('agent_type');
      expect(ragContext).toHaveProperty('retrieved_docs');
      expect(ragContext).toHaveProperty('formatted_context');
      expect(ragContext).toHaveProperty('token_count');
      expect(ragContext).toHaveProperty('retrieval_time_ms');

      // Verificar que encontró documentos
      expect(ragContext.retrieved_docs.length).toBeGreaterThan(0);

      // Verificar que el contexto está formateado
      expect(ragContext.formatted_context).toContain('📚 INFORMACIÓN RELEVANTE');
      expect(ragContext.formatted_context).toContain('Documento');

      // Verificar que el token count es razonable
      expect(ragContext.token_count).toBeGreaterThan(0);
      expect(ragContext.token_count).toBeLessThan(2000);

      // Verificar tiempo de recuperación
      expect(ragContext.retrieval_time_ms).toBeGreaterThan(0);
      expect(ragContext.retrieval_time_ms).toBeLessThan(5000); // < 5 segundos
    });

    it('should respect max_tokens limit', async () => {
      const shortContext = await generateRAGContext(
        'materiales disponibles',
        'material',
        {
          max_results: 5,
          max_tokens: 500, // Límite bajo
        }
      );

      const longContext = await generateRAGContext(
        'materiales disponibles',
        'material',
        {
          max_results: 5,
          max_tokens: 2000, // Límite alto
        }
      );

      // El contexto corto debe tener menos tokens
      expect(shortContext.token_count).toBeLessThanOrEqual(500);
      expect(longContext.token_count).toBeGreaterThan(shortContext.token_count);
    });

    it('should handle queries with no results', async () => {
      const ragContext = await generateRAGContext(
        'completely irrelevant nonsense',
        'material',
        {
          max_results: 3,
          match_threshold: 0.9,
        }
      );

      expect(ragContext.retrieved_docs).toHaveLength(0);
      expect(ragContext.formatted_context).toContain(
        'No se encontró información relevante'
      );
      expect(ragContext.token_count).toBeLessThan(50);
    });

    it('should work for engineering queries', async () => {
      const ragContext = await generateRAGContext(
        '¿Qué tolerancias podéis conseguir?',
        'engineering',
        {
          max_results: 3,
          match_threshold: 0.5,
        }
      );

      expect(ragContext.agent_type).toBe('engineering');
      expect(ragContext.retrieved_docs.length).toBeGreaterThan(0);

      const firstDoc = ragContext.retrieved_docs[0];
      expect(firstDoc.agent_type).toBe('engineering');
    });

    it('should work for providers queries', async () => {
      const ragContext = await generateRAGContext(
        'necesito anodizar piezas',
        'providers',
        {
          max_results: 3,
          match_threshold: 0.5,
        }
      );

      expect(ragContext.agent_type).toBe('providers');
      expect(ragContext.retrieved_docs.length).toBeGreaterThan(0);
    });

    it('should be fast (< 2 seconds)', async () => {
      const start = Date.now();

      await generateRAGContext('aluminio 7075', 'material', {
        max_results: 3,
        match_threshold: 0.6,
      });

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // Menos de 2 segundos
    });
  });

  describe('getKnowledgeStats', () => {
    it('should return statistics for knowledge base', async () => {
      const stats = await getKnowledgeStats();

      expect(stats).toBeTypeOf('object');

      // Verificar que tiene al menos un agent_type
      expect(Object.keys(stats).length).toBeGreaterThan(0);

      // Verificar estructura de las estadísticas
      Object.values(stats).forEach((agentStats: any) => {
        expect(agentStats).toHaveProperty('total');
        expect(agentStats).toHaveProperty('by_category');
        expect(agentStats).toHaveProperty('verified');

        expect(agentStats.total).toBeGreaterThan(0);
        expect(typeof agentStats.by_category).toBe('object');
        expect(typeof agentStats.verified).toBe('number');
      });
    });

    it('should show correct document counts', async () => {
      const stats = await getKnowledgeStats();

      // Verificamos que tengamos los 15 documentos seeded
      const totalDocs = Object.values(stats).reduce(
        (sum: number, agentStats: any) => sum + agentStats.total,
        0
      );

      expect(totalDocs).toBeGreaterThanOrEqual(15); // Al menos los 15 documentos iniciales
    });

    it('should have material, engineering, and providers stats', async () => {
      const stats = await getKnowledgeStats();

      expect(stats).toHaveProperty('material');
      expect(stats).toHaveProperty('engineering');
      expect(stats).toHaveProperty('providers');

      // Verificar conteos esperados del seeding
      expect(stats.material.total).toBeGreaterThanOrEqual(7);
      expect(stats.engineering.total).toBeGreaterThanOrEqual(4);
      expect(stats.providers.total).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent searches', async () => {
      const searches = [
        searchKnowledge({
          query: 'aluminio 7075',
          agent_type: 'material',
          match_count: 3,
        }),
        searchKnowledge({
          query: 'tolerancias',
          agent_type: 'engineering',
          match_count: 3,
        }),
        searchKnowledge({
          query: 'anodizado',
          agent_type: 'providers',
          match_count: 3,
        }),
      ];

      const results = await Promise.all(searches);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeInstanceOf(Array);
      });
    });

    it('should use embedding cache effectively', async () => {
      const query = 'aluminio 7075 para aplicaciones aeronáuticas';

      // Primera búsqueda (genera embedding)
      const start1 = Date.now();
      await searchKnowledge({
        query,
        agent_type: 'material',
        match_count: 3,
      });
      const duration1 = Date.now() - start1;

      // Segunda búsqueda (usa caché de embedding)
      const start2 = Date.now();
      await searchKnowledge({
        query,
        agent_type: 'material',
        match_count: 3,
      });
      const duration2 = Date.now() - start2;

      // La segunda búsqueda debe ser más rápida
      expect(duration2).toBeLessThan(duration1);
    });
  });
});
