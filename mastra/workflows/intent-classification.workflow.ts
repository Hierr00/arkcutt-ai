/**
 * 🎯 WORKFLOW: Intent Classification (DETERMINISTA)
 * Clasifica la intención del usuario usando REGLAS PRIMERO, LLM como fallback
 */

import {
  UserIntent,
  AgentType,
  IntentClassification,
  IntentClassificationSchema,
} from '@/types/workflow.types';
import { generateStructuredResponse, log } from '../index';

/**
 * Workflow principal de clasificación
 */
export async function classifyIntent(params: {
  message: string;
  userId: string;
  sessionId: string;
  userMemory?: any;
}): Promise<IntentClassification> {
  const { message, userId, userMemory } = params;

  log('info', `🎯 [Intent Classification] User: ${userId}`, {
    messageLength: message.length,
    hasMemory: !!userMemory,
  });

  // PASO 1: Análisis DETERMINISTA basado en reglas
  const ruleBasedResult = analyzeWithRules(message);

  if (ruleBasedResult.confidence > 0.85) {
    log('info', `✅ Rule-based match: ${ruleBasedResult.intent}`, {
      confidence: ruleBasedResult.confidence,
    });
    return ruleBasedResult;
  }

  // PASO 2: Si no hay match claro, usar LLM (pero con prompt MUY estructurado)
  log('debug', `🤖 Using LLM fallback (rule confidence: ${ruleBasedResult.confidence})`);
  const llmResult = await classifyWithLLM(message, userMemory);

  // PASO 3: Combinar resultados (preferencia a reglas)
  const finalResult = combineClassifications(ruleBasedResult, llmResult);

  log('info', `📊 Final intent: ${finalResult.intent}`, {
    confidence: finalResult.confidence,
    agent: finalResult.suggestedAgent,
  });

  return finalResult;
}

/**
 * 🔍 ANÁLISIS BASADO EN REGLAS (100% DETERMINISTA)
 */
function analyzeWithRules(message: string): IntentClassification {
  const msgLower = message.toLowerCase();
  const msgLength = message.length;

  // REGLA 1: Saludos simples
  const greetings = [
    'hola',
    'buenos dias',
    'buenos días',
    'buenas tardes',
    'buenas noches',
    'hey',
    'saludos',
    'buenas',
  ];

  if (greetings.some((g) => msgLower.trim().startsWith(g)) && msgLength < 30) {
    return {
      intent: UserIntent.GREETING,
      confidence: 1.0,
      entities: {},
      suggestedAgent: AgentType.NONE,
      reasoning: 'Saludo simple detectado por reglas',
    };
  }

  // REGLA 2: Consultas sobre materiales
  const materialKeywords = [
    'qué material',
    'que material',
    'material recomienda',
    'diferencia entre',
    'cual es mejor',
    'cuál es mejor',
    'aluminio',
    'acero',
    'titanio',
    'propiedades',
    'resistencia',
    'dureza',
    '6061',
    '7075',
    'f-1140',
    'f1140',
    'inoxidable',
    '304',
    '316',
    'comparar materiales',
  ];

  const materialMatches = materialKeywords.filter((kw) => msgLower.includes(kw));

  if (materialMatches.length >= 2 || (materialMatches.length >= 1 && !msgLower.includes('presupuesto'))) {
    const materials = extractMaterials(message);
    return {
      intent: UserIntent.MATERIAL_QUERY,
      confidence: 0.95,
      entities: { materials },
      suggestedAgent: AgentType.MATERIAL,
      reasoning: `Matched ${materialMatches.length} material keywords: ${materialMatches.slice(0, 3).join(', ')}`,
    };
  }

  // REGLA 3: Consultas sobre proveedores/tratamientos
  const providerKeywords = [
    'anodizado',
    'cromado',
    'tratamiento',
    'temple',
    'soldadura',
    'pintura',
    'galvanizado',
    'nitrurado',
    'pueden hacer',
    'ofrecen',
    'tratamiento térmico',
    'tratamiento termico',
    'tratamiento superficial',
  ];

  const providerMatches = providerKeywords.filter((kw) => msgLower.includes(kw));

  if (providerMatches.length >= 1 && !msgLower.includes('presupuesto')) {
    return {
      intent: UserIntent.PROVIDER_QUERY,
      confidence: 0.95,
      entities: {},
      suggestedAgent: AgentType.PROVEEDORES,
      reasoning: `Matched provider keywords: ${providerMatches.join(', ')}`,
    };
  }

  // REGLA 4: Solicitudes de presupuesto
  const budgetKeywords = [
    'presupuesto',
    'cotizar',
    'cotización',
    'cotizacion',
    'costo',
    'precio',
    'cuanto cuesta',
    'cuánto cuesta',
    'necesito',
  ];

  const hasBudgetKeyword = budgetKeywords.some((kw) => msgLower.includes(kw));
  const hasTechnicalData =
    /\d+\s*(pieza|unidad|pza)/i.test(message) || /tolerancia/i.test(message);

  if (hasBudgetKeyword || hasTechnicalData) {
    const entities = extractTechnicalEntities(message);
    const confidence = hasBudgetKeyword && hasTechnicalData ? 0.95 : 0.75;

    return {
      intent: UserIntent.BUDGET_REQUEST,
      confidence,
      entities,
      suggestedAgent: AgentType.INGENIERIA,
      reasoning: hasBudgetKeyword
        ? 'Budget request keywords detected'
        : 'Technical data suggests budget intent',
    };
  }

  // REGLA 5: Preguntas técnicas generales
  const technicalKeywords = [
    'capacidad',
    'pueden mecanizar',
    'tolerancias',
    'precisión',
    'precision',
    'cnc',
    'fresado',
    'torneado',
  ];

  const technicalMatches = technicalKeywords.filter((kw) => msgLower.includes(kw));

  if (technicalMatches.length >= 1) {
    return {
      intent: UserIntent.TECHNICAL_QUESTION,
      confidence: 0.8,
      entities: {},
      suggestedAgent: AgentType.INGENIERIA,
      reasoning: `Technical question detected: ${technicalMatches.join(', ')}`,
    };
  }

  // Si no hay match claro, confidence baja
  return {
    intent: UserIntent.UNCLEAR,
    confidence: 0.5,
    entities: {},
    suggestedAgent: AgentType.NONE,
    reasoning: 'No clear rule match found',
  };
}

/**
 * 🤖 CLASIFICACIÓN CON LLM (Fallback estructurado)
 */
async function classifyWithLLM(
  message: string,
  userMemory: any
): Promise<IntentClassification> {
  const prompt = `Clasifica esta consulta de cliente industrial.

CONTEXTO DEL USUARIO:
${userMemory ? JSON.stringify(userMemory, null, 2) : 'Usuario nuevo'}

MENSAJE:
"${message}"

CATEGORÍAS POSIBLES:
1. MATERIAL_QUERY - Preguntas sobre materiales (propiedades, comparaciones, recomendaciones)
2. PROVIDER_QUERY - Preguntas sobre servicios externos (tratamientos, soldaduras)
3. BUDGET_REQUEST - Solicitud de presupuesto con datos técnicos
4. TECHNICAL_QUESTION - Consultas técnicas sobre capacidades de fabricación
5. GREETING - Saludos sin consulta técnica
6. UNCLEAR - No queda claro qué necesita

Analiza el mensaje y extrae:
- Intent principal (una de las categorías)
- Confidence (0.0-1.0)
- Entities (materiales, cantidad, tolerancia, plazo en semanas)
- SuggestedAgent ("material", "proveedores", "ingenieria", o "none")
- Reasoning (explicación breve)

RESPONDE EN JSON con esta estructura EXACTA:
{
  "intent": "CATEGORÍA",
  "confidence": 0.0-1.0,
  "entities": {
    "materials": ["material1", ...] o [],
    "quantity": número o null,
    "tolerance": "string" o null,
    "deadline": número o null
  },
  "suggestedAgent": "material" | "proveedores" | "ingenieria" | "none",
  "reasoning": "Explicación breve"
}`;

  try {
    const result = await generateStructuredResponse<IntentClassification>({
      model: 'fast', // gpt-4o-mini para clasificación rápida
      messages: [
        { role: 'system', content: 'You are an intent classification expert for industrial machining.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    // Validar con Zod
    return IntentClassificationSchema.parse(result);
  } catch (error) {
    log('error', 'Error in LLM classification', error);
    // Fallback seguro
    return {
      intent: UserIntent.UNCLEAR,
      confidence: 0.4,
      entities: {},
      suggestedAgent: AgentType.NONE,
      reasoning: 'LLM classification failed',
    };
  }
}

/**
 * 🔄 COMBINAR CLASIFICACIONES
 * Preferencia a reglas si confidence > 0.85
 */
function combineClassifications(
  rulesBased: IntentClassification,
  llmBased: IntentClassification
): IntentClassification {
  // Preferencia absoluta a reglas si confidence > 0.85
  if (rulesBased.confidence > 0.85) {
    return rulesBased;
  }

  // Si ambas coinciden, aumentar confidence
  if (rulesBased.intent === llmBased.intent) {
    return {
      ...llmBased,
      confidence: Math.min((rulesBased.confidence + llmBased.confidence) / 2 + 0.1, 1.0),
      reasoning: `Rule + LLM agreement: ${llmBased.reasoning}`,
      entities: {
        ...rulesBased.entities,
        ...llmBased.entities,
      },
    };
  }

  // Si difieren, usar LLM pero con confidence reducida
  return {
    ...llmBased,
    confidence: llmBased.confidence * 0.8,
    reasoning: `LLM classification (rules disagreed): ${llmBased.reasoning}`,
  };
}

/**
 * HELPERS: Extracción de entidades
 */
function extractMaterials(message: string): string[] {
  const materials: string[] = [];
  const msgLower = message.toLowerCase();

  const materialPatterns = [
    { pattern: /6061/gi, material: 'Aluminio 6061' },
    { pattern: /7075/gi, material: 'Aluminio 7075' },
    { pattern: /f-?1140/gi, material: 'Acero F-1140' },
    { pattern: /(?:acero\s*)?inoxidable\s*304/gi, material: 'Acero Inoxidable 304' },
    { pattern: /(?:acero\s*)?inoxidable\s*316/gi, material: 'Acero Inoxidable 316' },
    { pattern: /titanio/gi, material: 'Titanio' },
  ];

  materialPatterns.forEach(({ pattern, material }) => {
    if (pattern.test(message)) {
      materials.push(material);
    }
  });

  return materials;
}

function extractTechnicalEntities(message: string) {
  const entities: any = {};

  // Cantidad
  const quantityMatch = message.match(/(\d+)\s*(pieza|unidad|pza)/i);
  if (quantityMatch) {
    entities.quantity = parseInt(quantityMatch[1]);
  }

  // Tolerancia
  const toleranceMatch = message.match(/(ISO\s*2768-?[fmcv]|±\s*[\d.]+\s*mm)/i);
  if (toleranceMatch) {
    entities.tolerance = toleranceMatch[1];
  }

  // Plazo
  const deadlineMatch = message.match(/(\d+)\s*semana/i);
  if (deadlineMatch) {
    entities.deadline = parseInt(deadlineMatch[1]);
  }

  // Materiales
  const materials = extractMaterials(message);
  if (materials.length > 0) {
    entities.materials = materials;
  }

  return entities;
}
