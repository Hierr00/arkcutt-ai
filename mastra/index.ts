/**
 * 🎯 SISTEMA DETERMINISTA DE AGENTES
 * Arquitectura inspirada en Mastra AI pero con máximo control y determinismo
 */

import { OpenAI } from 'openai';
import { LLM_CONFIG } from './config/llm.config';

// Validar API key
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

/**
 * Cliente OpenAI único para toda la aplicación
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Configuración de modelos
 */
export const models = {
  fast: LLM_CONFIG.fast.model,
  standard: LLM_CONFIG.standard.model,
  legacy: LLM_CONFIG.legacy.model,
} as const;

/**
 * Helper para generar respuestas con streaming
 */
export async function generateResponse(params: {
  model: keyof typeof models;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}) {
  const { model, messages, temperature, maxTokens } = params;

  const response = await openai.chat.completions.create({
    model: models[model],
    messages,
    temperature: temperature ?? 0.5,
    max_tokens: maxTokens ?? 2000,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Helper para generar respuestas estructuradas (JSON)
 */
export async function generateStructuredResponse<T = any>(params: {
  model: keyof typeof models;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
}) {
  const { model, messages, temperature } = params;

  const response = await openai.chat.completions.create({
    model: models[model],
    messages,
    temperature: temperature ?? 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  return JSON.parse(content) as T;
}

/**
 * Logging estructurado
 */
export function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logLevel = process.env.MASTRA_LOG_LEVEL || 'info';

  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if (levels[level] < levels[logLevel as keyof typeof levels]) {
    return;
  }

  const emoji = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
  };

  console.log(`${emoji[level]} [${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Export utilities
 */
export { LLM_CONFIG } from './config/llm.config';
export { AGENTS_CONFIG } from './config/agents.config';
export { SYSTEM_PROMPTS } from './config/llm.config';
