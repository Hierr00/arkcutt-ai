/**
 * 🤖 AGENT: Proveedores
 * Especialista en servicios externos (tratamientos, soldaduras, etc.)
 */

import { AgentExecutionContext } from '@/types/agents.types';
import { generateResponse, log } from '../index';
import { AGENTS_CONFIG } from '../config/agents.config';
import { SERVICES_DB } from '@/lib/constants';

export const proveedoresAgent = {
  ...AGENTS_CONFIG.proveedores,

  async execute(params: AgentExecutionContext): Promise<string> {
    const { messages, context } = params;
    const { classification, memoryContext } = context || {};

    log('info', `🤖 [Proveedores Agent] Executing`);

    const systemPrompt = `${AGENTS_CONFIG.proveedores.system}

SERVICIOS DISPONIBLES:
${JSON.stringify(Object.values(SERVICES_DB), null, 2)}

${memoryContext ? `\n🧠 CONTEXTO DE MEMORIA:\n${memoryContext}\n` : ''}

INSTRUCCIONES:
1. Explica los servicios de forma clara y técnica
2. Menciona tiempos estimados si están disponibles
3. Indica compatibilidad con materiales
4. Sugiere servicios complementarios cuando sea relevante
5. Si hay información de memoria (servicios usados anteriormente, preferencias), úsala para personalizar tu respuesta
6. Sé conciso (máximo 250 palabras)`;

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
