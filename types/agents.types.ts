/**
 * 🤖 TIPOS PARA AGENTES
 */

import { z } from 'zod';

// Mensajes del chat
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Contexto del agente
export interface AgentExecutionContext {
  messages: Message[];
  context?: {
    userMemory?: any;
    classification?: any;
    memoryContext?: string;
    fileInfo?: {
      filename: string;
      url: string;
      type: string;
    };
  };
}

// Base de datos de materiales
export interface MaterialInfo {
  nombre: string;
  categoria: 'aluminio' | 'acero' | 'inoxidable' | 'plastico' | 'titanio' | 'cobre';
  propiedades: {
    resistencia_traccion?: string;
    dureza?: string;
    densidad?: string;
    resistencia_corrosion?: string;
    maquinabilidad?: string;
    soldabilidad?: string;
  };
  aplicaciones: string[];
  ventajas: string[];
  limitaciones?: string[];
  precio_relativo: 'bajo' | 'medio' | 'alto' | 'muy-alto';
}

// Información de proveedores/servicios
export interface ServiceInfo {
  nombre: string;
  categoria:
    | 'tratamiento_termico'
    | 'tratamiento_superficial'
    | 'soldadura'
    | 'fundicion'
    | 'otro';
  descripcion: string;
  materiales_aplicables: string[];
  tiempo_estimado?: string;
  notas?: string;
}

// Validación técnica
export const TechnicalValidationSchema = z.object({
  isValid: z.boolean(),
  missingFields: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type TechnicalValidation = z.infer<typeof TechnicalValidationSchema>;

// Datos técnicos para presupuesto
export const BudgetDataSchema = z.object({
  material: z.string().optional(),
  cantidad: z.number().positive().optional(),
  tolerancia: z.string().optional(),
  plazo_semanas: z.number().positive().optional(),
  tratamientos: z.array(z.string()).optional(),
  observaciones: z.string().optional(),
});

export type BudgetData = z.infer<typeof BudgetDataSchema>;

// Datos de contacto
export const ContactDataSchema = z.object({
  nombre: z.string().optional(),
  empresa: z.string().optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
});

export type ContactData = z.infer<typeof ContactDataSchema>;
