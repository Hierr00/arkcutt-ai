/**
 * 🤖 AGENT: Proveedores
 * Especialista en servicios externos (tratamientos, soldaduras, etc.)
 */

import { AgentExecutionContext } from '@/types/agents.types';
import { generateResponse, log } from '../index';
import { AGENTS_CONFIG } from '../config/agents.config';
import { generateRAGContext } from '@/lib/services/rag.service';

export const proveedoresAgent = {
  ...AGENTS_CONFIG.proveedores,

  async execute(params: AgentExecutionContext): Promise<string> {
    const { messages, context } = params;
    const { classification, memoryContext } = context || {};

    log('info', `🤖 [Proveedores Agent] Executing`);

    // Extraer query del último mensaje del usuario
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMessage?.content || '';

    // Obtener contexto RAG optimizado para proveedores
    let ragContext = '';
    try {
      const ragResult = await generateRAGContext(query, 'providers', {
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

    const systemPrompt = `${AGENTS_CONFIG.proveedores.system}

${ragContext}

${memoryContext ? `\n🧠 CONTEXTO DE MEMORIA:\n${memoryContext}\n` : ''}

INSTRUCCIONES CRÍTICAS:
1. **IMPORTANTE**: Arkcutt SOLO realiza mecanizado CNC de metales. NO hacemos tratamientos, soldaduras, pinturas, ni otros servicios
2. Usa SOLO información de los documentos recuperados arriba para identificar proveedores externos
3. Explica los servicios de forma clara y técnica según la información de los proveedores
4. Menciona tiempos estimados y contactos de proveedores si están disponibles en los documentos
5. Indica compatibilidad con materiales según la información disponible
6. Sugiere servicios complementarios cuando sea relevante basándote en los documentos
7. Si hay información de memoria (servicios usados anteriormente, preferencias), úsala para personalizar tu respuesta
8. Si NO encuentras información relevante en los documentos, indícalo claramente
9. Sé conciso (máximo 250 palabras)`;

    try {
      const response = await generateResponse({
        model: 'standard', // gpt-4o
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.5,
        maxTokens: 1500,
      });

      log('debug', `✅ Proveedores Agent response generated`);
      return response;
    } catch (error) {
      log('error', 'Proveedores Agent error', error);
      return 'Disculpe, ha ocurrido un error procesando su consulta sobre servicios. Por favor, inténtelo de nuevo.';
    }
  },
};
