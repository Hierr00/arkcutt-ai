/**
 * ⚙️ CONFIGURACIÓN DE AGENTES
 */

import { SYSTEM_PROMPTS } from './llm.config';

export const AGENTS_CONFIG = {
  material: {
    name: 'Material Agent',
    id: 'material',
    system: SYSTEM_PROMPTS.material,
    model: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2000,
    description: 'Especialista en materiales industriales (aluminios, aceros, titanio)',
    capabilities: [
      'Recomendar materiales según aplicación',
      'Comparar propiedades técnicas',
      'Explicar ventajas y limitaciones',
    ],
  },

  proveedores: {
    name: 'Proveedores Agent',
    id: 'proveedores',
    system: SYSTEM_PROMPTS.proveedores,
    model: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2000,
    description: 'Especialista en servicios externos (tratamientos, soldaduras)',
    capabilities: [
      'Explicar tratamientos disponibles',
      'Verificar compatibilidad material-servicio',
      'Estimar tiempos de proceso',
    ],
  },

  ingenieria: {
    name: 'Ingeniería Agent',
    id: 'ingenieria',
    system: SYSTEM_PROMPTS.ingenieria,
    model: 'gpt-4o',
    temperature: 0.3, // Más bajo para consistencia en recolección de datos
    maxTokens: 2000,
    description: 'Especialista en gestión de presupuestos',
    capabilities: [
      'Recopilar datos técnicos completos',
      'Validar información de presupuesto',
      'Generar solicitudes estructuradas',
    ],
  },
} as const;

export type AgentId = keyof typeof AGENTS_CONFIG;
