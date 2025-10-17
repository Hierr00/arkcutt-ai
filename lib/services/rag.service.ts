/**
 * 🎯 RAG SERVICE
 * Retrieval-Augmented Generation service para Context Engineering
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { generateEmbedding } from './embeddings.service';
import {
  AgentType,
  KnowledgeCategory,
  KnowledgeEmbedding,
  CreateKnowledgeInput,
  SearchKnowledgeParams,
  SearchResult,
  RAGContext,
  RAGConfig,
} from '@/types/rag.types';
import { log } from '@/mastra';

const DEFAULT_CONFIG: RAGConfig = {
  embedding_model: 'text-embedding-3-small',
  embedding_dimensions: 1536,
  max_tokens_per_context: 1500,
  default_match_count: 5,
  default_match_threshold: 0.7,
  cache_ttl_seconds: 3600,
};

/**
 * Añade un documento a la base de conocimiento
 */
export async function addKnowledge(
  input: CreateKnowledgeInput
): Promise<KnowledgeEmbedding> {
  const startTime = Date.now();

  try {
    log('info', `📝 Adding knowledge: ${input.agent_type}/${input.category}`);

    // Generar embedding
    const embeddingResponse = await generateEmbedding(input.content);

    // Usar admin client para bypasear RLS
    const client = supabaseAdmin || supabase;

    // Insertar en Supabase
    const { data, error } = await client
      .from('knowledge_embeddings')
      .insert({
        agent_type: input.agent_type,
        category: input.category,
        subcategory: input.subcategory,
        content: input.content,
        embedding: embeddingResponse.embedding,
        metadata: input.metadata || {},
        importance_score: input.importance_score || 1.0,
        verified: input.verified || false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert knowledge: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    log('info', `✅ Knowledge added in ${duration}ms`);

    return data as KnowledgeEmbedding;
  } catch (error: any) {
    log('error', '❌ Failed to add knowledge', {
      error: error.message,
      agent_type: input.agent_type,
      category: input.category,
    });
    throw error;
  }
}

/**
 * Añade múltiples documentos en batch
 */
export async function addKnowledgeBatch(
  inputs: CreateKnowledgeInput[]
): Promise<KnowledgeEmbedding[]> {
  const startTime = Date.now();

  try {
    log('info', `📦 Adding ${inputs.length} knowledge documents in batch`);

    // Generar embeddings en batch
    const texts = inputs.map((input) => input.content);
    const embeddingResponses = await Promise.all(
      texts.map((text) => generateEmbedding(text))
    );

    // Preparar datos para inserción
    const records = inputs.map((input, index) => ({
      agent_type: input.agent_type,
      category: input.category,
      subcategory: input.subcategory,
      content: input.content,
      embedding: embeddingResponses[index].embedding,
      metadata: input.metadata || {},
      importance_score: input.importance_score || 1.0,
      verified: input.verified || false,
    }));

    // Usar admin client para bypasear RLS
    const client = supabaseAdmin || supabase;

    // Insertar en Supabase
    const { data, error } = await client
      .from('knowledge_embeddings')
      .insert(records)
      .select();

    if (error) {
      throw new Error(`Failed to insert knowledge batch: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    log('info', `✅ ${data.length} knowledge documents added in ${duration}ms`);

    return data as KnowledgeEmbedding[];
  } catch (error: any) {
    log('error', '❌ Failed to add knowledge batch', {
      error: error.message,
      batch_size: inputs.length,
    });
    throw error;
  }
}

/**
 * Busca conocimiento relevante usando similitud semántica
 */
export async function searchKnowledge(
  params: SearchKnowledgeParams
): Promise<SearchResult[]> {
  const startTime = Date.now();

  try {
    const {
      query,
      agent_type,
      category,
      match_threshold = DEFAULT_CONFIG.default_match_threshold,
      match_count = DEFAULT_CONFIG.default_match_count,
      use_hybrid = false,
    } = params;

    log('debug', `🔍 Searching knowledge: "${query.substring(0, 50)}..."`, {
      agent_type,
      category,
      use_hybrid,
    });

    // Generar embedding de la query
    const embeddingResponse = await generateEmbedding(query);

    // Decidir tipo de búsqueda
    const functionName = use_hybrid
      ? 'search_knowledge_hybrid'
      : 'search_knowledge';

    // Ejecutar búsqueda
    const { data, error } = await supabase.rpc(functionName, {
      query_embedding: embeddingResponse.embedding,
      query_text: use_hybrid ? query : undefined,
      agent_filter: agent_type || null,
      category_filter: category || null,
      match_threshold,
      match_count,
    });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    log('debug', `✅ Found ${data.length} results in ${duration}ms`);

    return data as SearchResult[];
  } catch (error: any) {
    log('error', '❌ Knowledge search failed', {
      error: error.message,
      query: params.query.substring(0, 100),
    });
    throw error;
  }
}

/**
 * Genera contexto RAG optimizado para un agente
 */
export async function generateRAGContext(
  query: string,
  agent_type: AgentType,
  options: {
    category?: KnowledgeCategory;
    max_results?: number;
    match_threshold?: number;
    use_hybrid?: boolean;
    max_tokens?: number;
  } = {}
): Promise<RAGContext> {
  const startTime = Date.now();

  try {
    const {
      category,
      max_results = DEFAULT_CONFIG.default_match_count,
      match_threshold = DEFAULT_CONFIG.default_match_threshold,
      use_hybrid = true,
      max_tokens = DEFAULT_CONFIG.max_tokens_per_context,
    } = options;

    log('info', `🧠 Generating RAG context for ${agent_type} agent`);

    // Buscar conocimiento relevante
    const results = await searchKnowledge({
      query,
      agent_type,
      category,
      match_count: max_results,
      match_threshold,
      use_hybrid,
    });

    // Formatear contexto optimizado
    const { formatted_context, token_count } = formatRAGContext(results, max_tokens);

    const duration = Date.now() - startTime;

    const ragContext: RAGContext = {
      query,
      agent_type,
      retrieved_docs: results,
      formatted_context,
      token_count,
      retrieval_time_ms: duration,
    };

    log('info', `✅ RAG context generated: ${results.length} docs, ~${token_count} tokens, ${duration}ms`);

    return ragContext;
  } catch (error: any) {
    log('error', '❌ Failed to generate RAG context', {
      error: error.message,
      agent_type,
      query: query.substring(0, 100),
    });
    throw error;
  }
}

/**
 * Formatea los resultados de búsqueda en un contexto legible
 */
function formatRAGContext(
  results: SearchResult[],
  max_tokens: number
): { formatted_context: string; token_count: number } {
  if (results.length === 0) {
    return {
      formatted_context: 'No se encontró información relevante en la base de conocimiento.',
      token_count: 20,
    };
  }

  const sections: string[] = [];
  let estimated_tokens = 0;

  // Aproximación: 1 token ≈ 4 caracteres en español
  const CHARS_PER_TOKEN = 4;
  const max_chars = max_tokens * CHARS_PER_TOKEN;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const relevance = Math.round(result.similarity * 100);

    const section = `📄 Documento ${i + 1} (Relevancia: ${relevance}%)
Categoría: ${result.category}
${result.content}
${result.metadata && Object.keys(result.metadata).length > 0 ? `Metadata: ${JSON.stringify(result.metadata)}` : ''}
`;

    const section_chars = section.length;
    const section_tokens = Math.ceil(section_chars / CHARS_PER_TOKEN);

    // Verificar si cabe en el presupuesto
    if (estimated_tokens + section_tokens > max_tokens) {
      // Truncar si es el primer documento, sino omitir
      if (i === 0) {
        const available_chars = max_chars - 100; // Dejar espacio para metadata
        const truncated = section.substring(0, available_chars) + '\n[... truncado]';
        sections.push(truncated);
        estimated_tokens = max_tokens;
      }
      break;
    }

    sections.push(section);
    estimated_tokens += section_tokens;
  }

  const formatted_context = `📚 INFORMACIÓN RELEVANTE DE LA BASE DE CONOCIMIENTO:

${sections.join('\n---\n\n')}

Total de documentos recuperados: ${results.length}
Documentos incluidos en contexto: ${sections.length}
`;

  return {
    formatted_context,
    token_count: estimated_tokens,
  };
}

/**
 * Actualiza un documento de conocimiento
 */
export async function updateKnowledge(
  id: string,
  updates: Partial<CreateKnowledgeInput>
): Promise<KnowledgeEmbedding> {
  try {
    log('debug', `📝 Updating knowledge: ${id}`);

    const updateData: any = {};

    // Si se actualiza el contenido, regenerar embedding
    if (updates.content) {
      const embeddingResponse = await generateEmbedding(updates.content);
      updateData.embedding = embeddingResponse.embedding;
      updateData.content = updates.content;
    }

    // Actualizar otros campos
    if (updates.category) updateData.category = updates.category;
    if (updates.subcategory !== undefined) updateData.subcategory = updates.subcategory;
    if (updates.metadata) updateData.metadata = updates.metadata;
    if (updates.importance_score !== undefined) updateData.importance_score = updates.importance_score;
    if (updates.verified !== undefined) updateData.verified = updates.verified;

    const { data, error } = await supabase
      .from('knowledge_embeddings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update knowledge: ${error.message}`);
    }

    log('info', `✅ Knowledge updated: ${id}`);

    return data as KnowledgeEmbedding;
  } catch (error: any) {
    log('error', '❌ Failed to update knowledge', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Elimina un documento de conocimiento
 */
export async function deleteKnowledge(id: string): Promise<void> {
  try {
    log('debug', `🗑️ Deleting knowledge: ${id}`);

    const { error } = await supabase
      .from('knowledge_embeddings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete knowledge: ${error.message}`);
    }

    log('info', `✅ Knowledge deleted: ${id}`);
  } catch (error: any) {
    log('error', '❌ Failed to delete knowledge', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Obtiene estadísticas de la base de conocimiento
 */
export async function getKnowledgeStats() {
  try {
    const { data, error } = await supabase
      .from('knowledge_embeddings')
      .select('agent_type, category, verified', { count: 'exact' });

    if (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }

    // Agrupar por agent_type
    const stats: Record<string, any> = {};

    data?.forEach((item) => {
      if (!stats[item.agent_type]) {
        stats[item.agent_type] = {
          total: 0,
          by_category: {},
          verified: 0,
        };
      }

      stats[item.agent_type].total++;

      if (!stats[item.agent_type].by_category[item.category]) {
        stats[item.agent_type].by_category[item.category] = 0;
      }
      stats[item.agent_type].by_category[item.category]++;

      if (item.verified) {
        stats[item.agent_type].verified++;
      }
    });

    return stats;
  } catch (error: any) {
    log('error', '❌ Failed to get knowledge stats', {
      error: error.message,
    });
    throw error;
  }
}
