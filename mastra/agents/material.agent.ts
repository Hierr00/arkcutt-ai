/**
 * 🤖 AGENT: Material
 * Especialista en materiales industriales
 */

import { AgentExecutionContext } from '@/types/agents.types';
import { generateResponse, log } from '../index';
import { AGENTS_CONFIG } from '../config/agents.config';
import { MATERIALS_DB } from '@/lib/constants';

export const materialAgent = {
  ...AGENTS_CONFIG.material,

  async execute(params: AgentExecutionContext): Promise<string> {
    const { messages, context } = params;
    const { classification, memoryContext } = context || {};

    log('info', `🤖 [Material Agent] Executing`);

    // Construir contexto rico con base de datos de materiales
    const materialContext = buildMaterialContext(classification?.entities);

    const systemPrompt = `${AGENTS_CONFIG.material.system}

BASE DE DATOS DE MATERIALES DISPONIBLE:
${JSON.stringify(Object.values(MATERIALS_DB), null, 2)}

CONTEXTO DE LA CONSULTA:
${materialContext}

${memoryContext ? `\n🧠 CONTEXTO DE MEMORIA:\n${memoryContext}\n` : ''}

INSTRUCCIONES:
1. Responde de forma técnica pero clara
2. Usa información REAL de la base de datos
3. Si comparas materiales, menciona propiedades específicas
4. Sugiere alternativas cuando sea relevante
5. Si hay información de memoria (preferencias del usuario, hechos recordados), úsala para personalizar tu respuesta
6. Sé conciso pero completo (máximo 300 palabras)`;

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
