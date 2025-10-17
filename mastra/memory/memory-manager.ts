/**
 * 🧠 MEMORY MANAGER
 * Sistema de memoria conversacional nativo con Mastra
 * - Memoria a corto plazo (sesión actual)
 * - Memoria a largo plazo (persistida en Supabase)
 * - Extracción y gestión de hechos relevantes
 */

import {
  ShortTermMemory,
  LongTermMemory,
  MemoryContext,
  MemoryUpdate,
  MemorizedFact,
  ConversationMessage,
  ExtractedEntities,
} from '@/types/memory.types';
import { generateStructuredResponse, log } from '../index';
import { getUserMemory, updateUserMemory } from '@/lib/supabase';

/**
 * In-memory store para sesiones activas (memoria a corto plazo)
 */
class MemoryStore {
  private sessions: Map<string, ShortTermMemory> = new Map();
  private readonly MAX_MESSAGES = 20; // Mantener últimos 20 mensajes en memoria

  set(sessionId: string, memory: ShortTermMemory) {
    // Limitar mensajes para no exceder contexto
    if (memory.messages.length > this.MAX_MESSAGES) {
      memory.messages = memory.messages.slice(-this.MAX_MESSAGES);
    }
    this.sessions.set(sessionId, memory);
  }

  get(sessionId: string): ShortTermMemory | undefined {
    return this.sessions.get(sessionId);
  }

  clear(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  // Limpiar sesiones antiguas (> 1 hora)
  cleanup() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [sessionId, memory] of this.sessions.entries()) {
      if (memory.lastUpdated < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

const memoryStore = new MemoryStore();

// Cleanup cada 10 minutos
setInterval(() => memoryStore.cleanup(), 10 * 60 * 1000);

/**
 * Obtener contexto completo de memoria para una sesión
 */
export async function getMemoryContext(
  sessionId: string,
  userId?: string
): Promise<MemoryContext> {
  log('debug', `🧠 [Memory] Getting context for session ${sessionId}`);

  // 1. Obtener memoria a corto plazo (sesión actual)
  let shortTerm = memoryStore.get(sessionId);

  if (!shortTerm) {
    shortTerm = {
      sessionId,
      messages: [],
      entities: {},
      intents: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    memoryStore.set(sessionId, shortTerm);
  }

  // 2. Obtener memoria a largo plazo (si hay userId)
  let longTerm: LongTermMemory | undefined;
  if (userId) {
    try {
      const userData = await getUserMemory(userId);
      if (userData) {
        longTerm = {
          userId,
          preferences: userData.preferences || {},
          facts: userData.facts || [],
          projectHistory: userData.project_history || [],
          frequentRequests: userData.frequent_requests || [],
          lastAccessed: new Date(),
        };
      }
    } catch (error) {
      log('warn', '⚠️ Could not fetch long-term memory', error);
    }
  }

  // 3. Obtener hechos relevantes
  const relevantFacts = selectRelevantFacts(shortTerm, longTerm);

  log('debug', `✅ Memory context ready: ${shortTerm.messages.length} messages, ${relevantFacts.length} facts`);

  return {
    shortTerm,
    longTerm,
    relevantFacts,
  };
}

/**
 * Actualizar memoria con nueva información
 */
export async function updateMemory(update: MemoryUpdate): Promise<void> {
  const { userId, sessionId, newFacts, updatedPreferences, newProject } = update;

  log('debug', `🧠 [Memory] Updating memory for session ${sessionId}`);

  // 1. Actualizar memoria a corto plazo
  const shortTerm = memoryStore.get(sessionId);
  if (shortTerm) {
    shortTerm.lastUpdated = new Date();
    memoryStore.set(sessionId, shortTerm);
  }

  // 2. Actualizar memoria a largo plazo (si hay userId y cambios)
  if (userId && (newFacts || updatedPreferences || newProject)) {
    try {
      const existingMemory = await getUserMemory(userId);

      const updatedMemory = {
        user_id: userId,
        preferences: {
          ...existingMemory?.preferences,
          ...updatedPreferences,
        },
        facts: [
          ...(existingMemory?.facts || []),
          ...(newFacts?.map((fact) => ({
            ...fact,
            id: generateFactId(),
            timestamp: new Date(),
            relevanceCount: 0,
          })) || []),
        ],
        project_history: [
          ...(existingMemory?.project_history || []),
          ...(newProject ? [{
            ...newProject,
            id: generateProjectId(),
            timestamp: new Date(),
          }] : []),
        ],
        frequent_requests: existingMemory?.frequent_requests || [],
      };

      await updateUserMemory(userId, updatedMemory);
      log('debug', '✅ Long-term memory updated in database');
    } catch (error) {
      log('error', '❌ Failed to update long-term memory', error);
    }
  }
}

/**
 * Añadir mensaje a la memoria a corto plazo
 */
export function addMessage(
  sessionId: string,
  message: Omit<ConversationMessage, 'timestamp'>
): void {
  let shortTerm = memoryStore.get(sessionId);

  if (!shortTerm) {
    shortTerm = {
      sessionId,
      messages: [],
      entities: {},
      intents: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  shortTerm.messages.push({
    ...message,
    timestamp: new Date(),
  });

  shortTerm.lastUpdated = new Date();
  memoryStore.set(sessionId, shortTerm);
}

/**
 * Actualizar entidades extraídas en la sesión
 */
export function updateSessionEntities(
  sessionId: string,
  entities: Partial<ExtractedEntities>
): void {
  const shortTerm = memoryStore.get(sessionId);
  if (!shortTerm) return;

  // Merge entities
  if (entities.materials) {
    shortTerm.entities.materials = [
      ...(shortTerm.entities.materials || []),
      ...entities.materials,
    ].filter((v, i, a) => a.indexOf(v) === i); // unique
  }

  if (entities.services) {
    shortTerm.entities.services = [
      ...(shortTerm.entities.services || []),
      ...entities.services,
    ].filter((v, i, a) => a.indexOf(v) === i);
  }

  if (entities.quantities) {
    shortTerm.entities.quantities = entities.quantities;
  }

  if (entities.budget) {
    shortTerm.entities.budget = {
      ...shortTerm.entities.budget,
      ...entities.budget,
    };
  }

  memoryStore.set(sessionId, shortTerm);
}

/**
 * Actualizar intents detectados en la sesión
 */
export function updateSessionIntents(sessionId: string, intent: string): void {
  const shortTerm = memoryStore.get(sessionId);
  if (!shortTerm) return;

  if (!shortTerm.intents.includes(intent)) {
    shortTerm.intents.push(intent);
  }

  memoryStore.set(sessionId, shortTerm);
}

/**
 * Extraer hechos importantes de una conversación usando LLM
 */
export async function extractFactsFromConversation(
  messages: ConversationMessage[],
  userId: string
): Promise<MemorizedFact[]> {
  if (messages.length < 2) return [];

  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const systemPrompt = `Analiza esta conversación y extrae hechos importantes sobre el usuario que deberían recordarse para futuras interacciones.

CATEGORÍAS DE HECHOS:
- preference: Preferencias explícitas del usuario (ej: "prefiero aluminio 7075")
- requirement: Requisitos técnicos o constraints (ej: "siempre necesito certificación")
- constraint: Limitaciones o restricciones (ej: "no puedo superar 1000€")
- feedback: Retroalimentación o comentarios (ej: "el último pedido llegó tarde")

RESPONDE EN JSON:
{
  "facts": [
    {
      "content": "texto del hecho",
      "category": "preference|requirement|constraint|feedback",
      "confidence": 0.0-1.0,
      "source": "explicit|inferred"
    }
  ]
}

CONVERSACIÓN:
${conversationText}`;

  try {
    const response = await generateStructuredResponse<{
      facts: Array<{
        content: string;
        category: 'preference' | 'requirement' | 'constraint' | 'feedback';
        confidence: number;
        source: 'explicit' | 'inferred';
      }>;
    }>({
      model: 'fast',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.3,
    });

    return response.facts.map((fact) => ({
      id: generateFactId(),
      ...fact,
      timestamp: new Date(),
      relevanceCount: 0,
    }));
  } catch (error) {
    log('error', '❌ Failed to extract facts', error);
    return [];
  }
}

/**
 * Seleccionar hechos relevantes para el contexto actual
 */
function selectRelevantFacts(
  shortTerm: ShortTermMemory,
  longTerm?: LongTermMemory
): MemorizedFact[] {
  if (!longTerm || !longTerm.facts.length) return [];

  // Por ahora, retornar los 5 hechos más recientes con mayor relevanceCount
  return longTerm.facts
    .sort((a, b) => {
      // Priorizar por relevanceCount y luego por fecha
      if (b.relevanceCount !== a.relevanceCount) {
        return b.relevanceCount - a.relevanceCount;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .slice(0, 5);
}

/**
 * Helpers
 */
function generateFactId(): string {
  return `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Limpiar sesión (cuando el usuario cierra la sesión explícitamente)
 */
export function clearSession(sessionId: string): void {
  memoryStore.clear(sessionId);
  log('debug', `🧠 [Memory] Session ${sessionId} cleared`);
}

/**
 * Generar resumen de memoria para contexto de agente
 */
export function formatMemoryForAgent(context: MemoryContext): string {
  const parts: string[] = [];

  // Memoria a corto plazo
  if (context.shortTerm.entities && Object.keys(context.shortTerm.entities).length > 0) {
    parts.push('INFORMACIÓN DE LA SESIÓN ACTUAL:');

    if (context.shortTerm.entities.materials?.length) {
      parts.push(`- Materiales mencionados: ${context.shortTerm.entities.materials.join(', ')}`);
    }

    if (context.shortTerm.entities.services?.length) {
      parts.push(`- Servicios mencionados: ${context.shortTerm.entities.services.join(', ')}`);
    }

    if (context.shortTerm.entities.quantities?.length) {
      parts.push(`- Cantidades: ${context.shortTerm.entities.quantities.join(', ')} piezas`);
    }

    if (context.shortTerm.entities.budget) {
      parts.push(`- Presupuesto: ${JSON.stringify(context.shortTerm.entities.budget)}`);
    }
  }

  // Memoria a largo plazo
  if (context.longTerm) {
    parts.push('\nINFORMACIÓN DEL USUARIO (histórico):');

    if (context.longTerm.preferences.preferredMaterials?.length) {
      parts.push(`- Materiales preferidos: ${context.longTerm.preferences.preferredMaterials.join(', ')}`);
    }

    if (context.longTerm.preferences.typicalQuantities) {
      parts.push(`- Volúmenes típicos: ${context.longTerm.preferences.typicalQuantities}`);
    }

    if (context.longTerm.preferences.industry) {
      parts.push(`- Industria: ${context.longTerm.preferences.industry}`);
    }
  }

  // Hechos relevantes
  if (context.relevantFacts.length > 0) {
    parts.push('\nHECHOS IMPORTANTES A RECORDAR:');
    context.relevantFacts.forEach((fact, i) => {
      parts.push(`${i + 1}. ${fact.content} (${fact.category})`);
    });
  }

  return parts.length > 0 ? parts.join('\n') : 'No hay información adicional de memoria.';
}
