import { z } from 'zod';

/**
 * 🎯 TIPOS PARA WORKFLOWS DETERMINISTAS
 */

// Intenciones posibles (ENUM fijo para máximo determinismo)
export enum UserIntent {
  GREETING = 'GREETING',
  MATERIAL_QUERY = 'MATERIAL_QUERY',
  PROVIDER_QUERY = 'PROVIDER_QUERY',
  BUDGET_REQUEST = 'BUDGET_REQUEST',
  TECHNICAL_QUESTION = 'TECHNICAL_QUESTION',
  UNCLEAR = 'UNCLEAR',
}

// Agentes disponibles
export enum AgentType {
  MATERIAL = 'material',
  PROVEEDORES = 'proveedores',
  INGENIERIA = 'ingenieria',
  NONE = 'none',
}

// Schema de clasificación de intención
export const IntentClassificationSchema = z.object({
  intent: z.nativeEnum(UserIntent),
  confidence: z.number().min(0).max(1),
  entities: z.object({
    materials: z.array(z.string()).optional(),
    quantity: z.number().optional(),
    tolerance: z.string().optional(),
    deadline: z.number().optional(),
  }),
  suggestedAgent: z.nativeEnum(AgentType),
  reasoning: z.string(),
});

export type IntentClassification = z.infer<typeof IntentClassificationSchema>;

// Schema de entrada para workflow principal
export const WorkflowInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  sessionId: z.string(),
  userId: z.string().optional(),
  fileInfo: z
    .object({
      filename: z.string(),
      url: z.string(),
      type: z.string(),
    })
    .optional(),
});

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

// Schema de salida del workflow
export const WorkflowOutputSchema = z.object({
  response: z.string(),
  agent: z.string(),
  metadata: z.object({
    intent: z.string(),
    confidence: z.number(),
    processingTime: z.number(),
    memoryUpdated: z.boolean(),
  }),
});

export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>;

// Contexto del agente
export interface AgentContext {
  userMemory?: any;
  classification?: IntentClassification;
  fileInfo?: {
    filename: string;
    url: string;
    type: string;
  };
}
