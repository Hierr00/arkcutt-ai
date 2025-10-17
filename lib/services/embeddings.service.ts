/**
 * 🧠 EMBEDDINGS SERVICE
 * Servicio para generar embeddings con OpenAI
 */

import { openai } from '@/mastra';
import { EmbeddingRequest, EmbeddingResponse } from '@/types/rag.types';
import { log } from '@/mastra';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100; // OpenAI limit

/**
 * Caché en memoria para embeddings (evitar regenerar los mismos)
 */
class EmbeddingCache {
  private cache: Map<string, { embedding: number[]; timestamp: number }> = new Map();
  private readonly TTL_MS = 3600000; // 1 hora

  get(text: string): number[] | null {
    const cached = this.cache.get(text);
    if (!cached) return null;

    // Verificar si expiró
    if (Date.now() - cached.timestamp > this.TTL_MS) {
      this.cache.delete(text);
      return null;
    }

    return cached.embedding;
  }

  set(text: string, embedding: number[]): void {
    this.cache.set(text, {
      embedding,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Limpiar entradas expiradas
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL_MS) {
        this.cache.delete(key);
      }
    }
  }
}

const embeddingCache = new EmbeddingCache();

// Cleanup periódico cada 10 minutos
setInterval(() => embeddingCache.cleanup(), 10 * 60 * 1000);

/**
 * Genera embedding para un texto usando OpenAI
 */
export async function generateEmbedding(
  text: string,
  options: {
    model?: string;
    useCache?: boolean;
  } = {}
): Promise<EmbeddingResponse> {
  const { model = EMBEDDING_MODEL, useCache = true } = options;

  // Validar entrada
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Verificar caché
  if (useCache) {
    const cached = embeddingCache.get(text);
    if (cached) {
      log('debug', '✅ Using cached embedding');
      return {
        embedding: cached,
        model,
        usage: {
          prompt_tokens: 0, // Desde caché
          total_tokens: 0,
        },
      };
    }
  }

  try {
    log('debug', `🔄 Generating embedding for text (${text.length} chars)`);

    const response = await openai.embeddings.create({
      model,
      input: text,
    });

    const embedding = response.data[0].embedding;

    // Validar dimensiones
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`
      );
    }

    // Guardar en caché
    if (useCache) {
      embeddingCache.set(text, embedding);
    }

    log('debug', `✅ Embedding generated (${response.usage.total_tokens} tokens)`);

    return {
      embedding,
      model: response.model,
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        total_tokens: response.usage.total_tokens,
      },
    };
  } catch (error: any) {
    log('error', '❌ Failed to generate embedding', {
      error: error.message,
      text_length: text.length,
    });
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Genera embeddings para múltiples textos en batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: {
    model?: string;
    useCache?: boolean;
  } = {}
): Promise<EmbeddingResponse[]> {
  const { model = EMBEDDING_MODEL, useCache = true } = options;

  if (texts.length === 0) {
    return [];
  }

  // Procesar en chunks si excede el límite
  if (texts.length > MAX_BATCH_SIZE) {
    log('info', `Processing ${texts.length} texts in batches of ${MAX_BATCH_SIZE}`);

    const results: EmbeddingResponse[] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const batchResults = await generateEmbeddingsBatch(batch, { model, useCache });
      results.push(...batchResults);
    }
    return results;
  }

  // Identificar textos que necesitan embedding (no están en caché)
  const textsToEmbed: { text: string; index: number }[] = [];
  const cachedResults: (EmbeddingResponse | null)[] = new Array(texts.length).fill(null);

  texts.forEach((text, index) => {
    if (useCache) {
      const cached = embeddingCache.get(text);
      if (cached) {
        cachedResults[index] = {
          embedding: cached,
          model,
          usage: { prompt_tokens: 0, total_tokens: 0 },
        };
        return;
      }
    }
    textsToEmbed.push({ text, index });
  });

  log('debug', `📦 Batch: ${texts.length} texts, ${textsToEmbed.length} need embedding, ${texts.length - textsToEmbed.length} cached`);

  // Si todos estaban en caché
  if (textsToEmbed.length === 0) {
    return cachedResults as EmbeddingResponse[];
  }

  try {
    const response = await openai.embeddings.create({
      model,
      input: textsToEmbed.map((t) => t.text),
    });

    // Procesar resultados
    textsToEmbed.forEach((item, resultIndex) => {
      const embedding = response.data[resultIndex].embedding;

      // Guardar en caché
      if (useCache) {
        embeddingCache.set(item.text, embedding);
      }

      cachedResults[item.index] = {
        embedding,
        model: response.model,
        usage: {
          prompt_tokens: Math.floor(response.usage.prompt_tokens / textsToEmbed.length),
          total_tokens: Math.floor(response.usage.total_tokens / textsToEmbed.length),
        },
      };
    });

    log('debug', `✅ Batch embeddings generated (${response.usage.total_tokens} tokens)`);

    return cachedResults as EmbeddingResponse[];
  } catch (error: any) {
    log('error', '❌ Failed to generate batch embeddings', {
      error: error.message,
      batch_size: textsToEmbed.length,
    });
    throw new Error(`Batch embedding generation failed: ${error.message}`);
  }
}

/**
 * Calcula similitud coseno entre dos embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Limpia el caché de embeddings
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  log('info', '🗑️ Embedding cache cleared');
}

/**
 * Exporta estadísticas del caché
 */
export function getEmbeddingCacheStats() {
  return {
    size: embeddingCache['cache'].size,
    ttl_ms: embeddingCache['TTL_MS'],
  };
}
