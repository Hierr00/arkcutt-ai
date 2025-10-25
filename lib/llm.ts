/**
 * 🤖 LLM CLIENT
 * Configuración de OpenAI
 */

import OpenAI from 'openai';

let _openaiClient: OpenAI | null = null;

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    if (!_openaiClient) {
      _openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
    }
    return (_openaiClient as any)[prop];
  },
});
