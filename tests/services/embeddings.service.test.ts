/**
 * 🧪 EMBEDDINGS SERVICE TESTS
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/services/embeddings.service';

describe('Embeddings Service', () => {
  beforeAll(() => {
    // Verificar que las variables de entorno están configuradas
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for simple text', async () => {
      const text = 'Aluminio 7075 para aplicaciones aeronáuticas';

      const result = await generateEmbedding(text);

      expect(result).toHaveProperty('embedding');
      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.embedding).toHaveLength(1536); // text-embedding-3-small dimensions
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.usage.total_tokens).toBeGreaterThan(0);
    });

    it('should generate different embeddings for different texts', async () => {
      const text1 = 'Aluminio 7075';
      const text2 = 'Acero inoxidable 316L';

      const result1 = await generateEmbedding(text1);
      const result2 = await generateEmbedding(text2);

      // Los embeddings deben ser diferentes
      expect(result1.embedding).not.toEqual(result2.embedding);
    });

    it('should use cache for repeated requests', async () => {
      const text = 'Test caching';

      // Primera llamada
      const start1 = Date.now();
      const result1 = await generateEmbedding(text, { useCache: true });
      const duration1 = Date.now() - start1;

      // Segunda llamada (debe usar caché)
      const start2 = Date.now();
      const result2 = await generateEmbedding(text, { useCache: true });
      const duration2 = Date.now() - start2;

      expect(result1.embedding).toEqual(result2.embedding);
      expect(duration2).toBeLessThan(duration1); // Caché debe ser más rápido
      expect(result2.usage.total_tokens).toBe(0); // Sin tokens consumidos (caché)
    });

    it('should handle long text', async () => {
      const longText = 'A'.repeat(1000); // Texto largo

      const result = await generateEmbedding(longText);

      expect(result.embedding).toHaveLength(1536);
      expect(result.usage.prompt_tokens).toBeGreaterThan(100);
    });
  });

  describe('generateEmbeddingsBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'Aluminio 7075',
        'Acero inoxidable 316L',
        'Titanio grado 5',
      ];

      const results = await generateEmbeddingsBatch(texts);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.embedding).toHaveLength(1536);
      });
    });

    it('should process batch faster than individual calls', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];

      // Batch
      const batchStart = Date.now();
      await generateEmbeddingsBatch(texts);
      const batchDuration = Date.now() - batchStart;

      // Individual (sin caché)
      const individualStart = Date.now();
      for (const text of texts) {
        await generateEmbedding(text, { useCache: false });
      }
      const individualDuration = Date.now() - individualStart;

      // Batch debe ser más rápido o similar (no mucho más lento)
      expect(batchDuration).toBeLessThanOrEqual(individualDuration * 1.5);
    });
  });
});
