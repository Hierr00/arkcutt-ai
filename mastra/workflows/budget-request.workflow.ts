/**
 * 🎯 WORKFLOW PRINCIPAL: Budget Request
 * Orquesta todo el flujo de la solicitud (DETERMINISTA)
 */

import { WorkflowInput, WorkflowOutput, AgentType } from '@/types/workflow.types';
import { classifyIntent } from './intent-classification.workflow';
import { saveConversation } from '@/lib/supabase';
import { validateUserInput, sanitizeAgentOutput } from '@/lib/validators';
import { log } from '../index';
import {
  getMemoryContext,
  addMessage,
  updateSessionEntities,
  updateSessionIntents,
  updateMemory,
  extractFactsFromConversation,
  formatMemoryForAgent,
} from '../memory/memory-manager';

// Import agents (will be created next)
import { materialAgent } from '../agents/material.agent';
import { proveedoresAgent } from '../agents/proveedores.agent';
import { ingenieriaAgent } from '../agents/ingenieria.agent';

/**
 * WORKFLOW PRINCIPAL - 100% Determinista
 * Cada paso está claramente definido y es auditable
 */
export async function budgetRequestWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  const startTime = Date.now();
  const { messages, sessionId, userId, fileInfo } = input;

  log('info', `\n🚀 [Main Workflow] Session: ${sessionId}`, {
    userId,
    messageCount: messages.length,
    hasFile: !!fileInfo,
  });

  try {
    // PASO 1: Validar entrada (Guardrails)
    const lastMessage = messages[messages.length - 1].content;
    const inputValidation = validateUserInput(lastMessage);

    if (!inputValidation.isValid) {
      log('warn', '⚠️ Invalid input detected', { reason: inputValidation.reason });
      return {
        response: `Disculpe, ${inputValidation.reason}. Por favor, inténtelo de nuevo.`,
        agent: 'Guardrails',
        metadata: {
          intent: 'INVALID_INPUT',
          confidence: 1.0,
          processingTime: Date.now() - startTime,
          memoryUpdated: false,
        },
      };
    }

    // PASO 2: Obtener contexto de memoria completo (corto + largo plazo)
    const memoryContext = await getMemoryContext(sessionId, userId);
    log('debug', `🧠 Memory loaded: ${memoryContext.shortTerm.messages.length} messages, ${memoryContext.relevantFacts.length} facts`);

    // Añadir mensaje del usuario a la memoria a corto plazo
    addMessage(sessionId, {
      role: 'user',
      content: lastMessage,
    });

    // PASO 3: Clasificar intención (Workflow hijo DETERMINISTA)
    const classification = await classifyIntent({
      message: lastMessage,
      userId: userId || 'anonymous',
      sessionId,
      userMemory: memoryContext.longTerm,
    });

    log('info', `🎯 Intent: ${classification.intent} → Agent: ${classification.suggestedAgent}`);

    // Actualizar intents en memoria de sesión
    updateSessionIntents(sessionId, classification.intent);

    // Actualizar entidades extraídas en memoria de sesión
    if (classification.entities) {
      updateSessionEntities(sessionId, classification.entities);
    }

    // PASO 4: Routing DETERMINISTA (IF/ELSE, NO LLM)
    let response: string;
    let agentUsed: string;

    // Formatear contexto de memoria para agentes
    const memoryContextForAgent = formatMemoryForAgent(memoryContext);

    switch (classification.suggestedAgent) {
      case AgentType.MATERIAL:
        log('info', '→ Routing to Material Agent');
        response = await materialAgent.execute({
          messages,
          context: {
            userMemory: memoryContext.longTerm,
            memoryContext: memoryContextForAgent,
            classification,
            fileInfo
          },
        });
        agentUsed = 'Material Agent';
        break;

      case AgentType.PROVEEDORES:
        log('info', '→ Routing to Proveedores Agent');
        response = await proveedoresAgent.execute({
          messages,
          context: {
            userMemory: memoryContext.longTerm,
            memoryContext: memoryContextForAgent,
            classification,
            fileInfo
          },
        });
        agentUsed = 'Proveedores Agent';
        break;

      case AgentType.INGENIERIA:
        log('info', '→ Routing to Ingeniería Agent');
        response = await ingenieriaAgent.execute({
          messages,
          context: {
            userMemory: memoryContext.longTerm,
            memoryContext: memoryContextForAgent,
            classification,
            fileInfo
          },
        });
        agentUsed = 'Ingeniería Agent';
        break;

      case AgentType.NONE:
      default:
        log('info', '→ Simple response (no agent needed)');
        response = handleSimpleInteraction(classification.intent, lastMessage);
        agentUsed = 'Triage';
        break;
    }

    // PASO 5: Validar salida (Guardrails)
    response = sanitizeAgentOutput(response);

    // Añadir respuesta del agente a la memoria a corto plazo
    addMessage(sessionId, {
      role: 'assistant',
      content: response,
      metadata: {
        agent: agentUsed,
        intent: classification.intent,
      },
    });

    // PASO 6: Actualizar memoria a largo plazo (extraer hechos importantes)
    let memoryUpdated = false;
    if (userId && memoryContext.shortTerm.messages.length >= 4) {
      // Extraer hechos cada 4 mensajes (2 intercambios completos)
      try {
        const newFacts = await extractFactsFromConversation(
          memoryContext.shortTerm.messages.slice(-4),
          userId
        );

        if (newFacts.length > 0) {
          await updateMemory({
            userId,
            sessionId,
            newFacts: newFacts.map(f => ({
              content: f.content,
              category: f.category,
              confidence: f.confidence,
              source: f.source,
            })),
          });

          memoryUpdated = true;
          log('debug', `🧠 Extracted ${newFacts.length} new facts to long-term memory`);
        }
      } catch (error) {
        log('warn', '⚠️ Failed to update long-term memory', error);
      }
    }

    // PASO 7: Persistir en Supabase (auditoría completa) - solo si está configurado
    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://tu-proyecto.supabase.co') {
      try {
        await saveConversation({
          sessionId,
          userId,
          userMessage: lastMessage,
          agentResponse: response,
          agent: agentUsed,
          intent: classification.intent,
          confidence: classification.confidence,
          metadata: {
            entities: classification.entities,
            reasoning: classification.reasoning,
          },
        });
        log('debug', '💾 Conversation saved to database');
      } catch (error) {
        log('debug', '⚠️ Supabase not configured, skipping conversation save');
      }
    }

    const processingTime = Date.now() - startTime;
    log('info', `✅ Workflow completed in ${processingTime}ms\n`);

    return {
      response,
      agent: agentUsed,
      metadata: {
        intent: classification.intent,
        confidence: classification.confidence,
        processingTime,
        memoryUpdated,
      },
    };
  } catch (error) {
    log('error', '❌ Workflow error', error);

    return {
      response:
        'Disculpe, ha ocurrido un error procesando su solicitud. Por favor, inténtelo de nuevo.',
      agent: 'Error Handler',
      metadata: {
        intent: 'ERROR',
        confidence: 0,
        processingTime: Date.now() - startTime,
        memoryUpdated: false,
      },
    };
  }
}

/**
 * Manejar interacciones simples (sin agente)
 */
function handleSimpleInteraction(intent: string, message: string): string {
  switch (intent) {
    case 'GREETING':
      return '¡Buenos días! Soy el asistente de Arkcutt para mecanizado industrial CNC. ¿En qué puedo ayudarle hoy?\n\nPuedo asistirle con:\n- Información sobre materiales (aluminios, aceros, titanio)\n- Tratamientos y servicios externos\n- Solicitudes de presupuesto';

    case 'UNCLEAR':
      return 'Disculpe, no he entendido completamente su consulta. ¿Podría proporcionar más detalles?\n\nPor ejemplo:\n- ¿Necesita información sobre materiales?\n- ¿Requiere un presupuesto?\n- ¿Tiene preguntas sobre nuestros servicios?';

    default:
      return 'Entiendo su consulta. ¿Podría proporcionar más información para ayudarle mejor?';
  }
}
