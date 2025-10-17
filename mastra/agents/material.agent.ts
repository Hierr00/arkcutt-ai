/**
 * 🤖 AGENT: Material
 * Especialista en materiales industriales
 */

import { AgentExecutionContext } from '@/types/agents.types';
import { generateResponse, log } from '../index';
import { AGENTS_CONFIG } from '../config/agents.config';
import { generateRAGContext } from '@/lib/services/rag.service';

export const materialAgent = {
  ...AGENTS_CONFIG.material,

  async execute(params: AgentExecutionContext): Promise<string> {
    const { messages, context } = params;
    const { classification, memoryContext } = context || {};

    log('info', `🤖 [Material Agent] Executing`);

    // Extraer query del último mensaje del usuario
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMessage?.content || '';

    // Obtener contexto RAG optimizado (solo información relevante)
    let ragContext = '';
    try {
      const ragResult = await generateRAGContext(query, 'material', {
        max_results: 5,
        match_threshold: 0.6,
        use_hybrid: false,
        max_tokens: 1200,
      });
      ragContext = ragResult.formatted_context;
      log('debug', `📚 RAG context retrieved: ${ragResult.retrieved_docs.length} docs, ~${ragResult.token_count} tokens`);
    } catch (error: any) {
      log('error', 'Failed to retrieve RAG context', { error: error.message });
      ragContext = 'No se pudo recuperar información de la base de conocimiento.';
    }

    // Construir contexto de entidades identificadas
    const materialContext = buildMaterialContext(classification?.entities);

    const systemPrompt = `${AGENTS_CONFIG.material.system}

${ragContext}

CONTEXTO DE LA CONSULTA:
${materialContext}

${memoryContext ? `\n🧠 CONTEXTO DE MEMORIA:\n${memoryContext}\n` : ''}

INSTRUCCIONES:
1. Responde de forma técnica pero clara
2. Usa SOLO información de los documentos recuperados arriba
3. Si comparas materiales, menciona propiedades específicas de los documentos
4. Sugiere alternativas cuando sea relevante basándote en la información disponible
5. Si hay información de memoria (preferencias del usuario, hechos recordados), úsala para personalizar tu respuesta
6. Si NO encuentras información relevante en los documentos, indícalo claramente
7. Sé conciso pero completo (máximo 300 palabras)`;

    try {
      const response = await generateResponse({
        model: 'standard', // gpt-4o
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.5,
        maxTokens: 1500,
      });

      log('debug', `✅ Material Agent response generated (${response.length} chars)`);
      return response;
    } catch (error) {
      log('error', 'Material Agent error', error);
      return 'Disculpe, ha ocurrido un error procesando su consulta sobre materiales. Por favor, inténtelo de nuevo.';
    }
  },
};

function buildMaterialContext(entities?: any): string {
  if (!entities) return 'No se identificaron materiales específicos en la consulta.';

  const parts: string[] = [];

  if (entities.materials && entities.materials.length > 0) {
    parts.push(`Materiales mencionados: ${entities.materials.join(', ')}`);
  }

  if (entities.quantity) {
    parts.push(`Cantidad: ${entities.quantity} piezas`);
  }

  return parts.length > 0 ? parts.join('\n') : 'Consulta general sobre materiales';
}
