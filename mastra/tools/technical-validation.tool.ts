/**
 * 🛠️ TOOL: Technical Validation
 * Validación de datos técnicos para presupuestos
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';
import { validateBudgetData, validateContactData } from '@/lib/validators';
import { BudgetDataSchema, ContactDataSchema } from '@/types/agents.types';

/**
 * Tool para validar datos técnicos
 */
export const validateTechnicalDataTool = createTool({
  id: 'validate-technical-data',
  description: 'Valida que los datos técnicos para un presupuesto estén completos y sean correctos',
  inputSchema: z.object({
    datosTecnicos: BudgetDataSchema,
  }),
  outputSchema: z.object({
    isValid: z.boolean(),
    missingFields: z.array(z.string()),
    warnings: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { datosTecnicos } = context;
    return validateBudgetData(datosTecnicos);
  },
});

/**
 * Tool para validar datos de contacto
 */
export const validateContactDataTool = createTool({
  id: 'validate-contact-data',
  description: 'Valida que los datos de contacto estén completos y sean correctos',
  inputSchema: z.object({
    datosContacto: ContactDataSchema,
  }),
  outputSchema: z.object({
    isValid: z.boolean(),
    missingFields: z.array(z.string()),
    warnings: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { datosContacto } = context;
    return validateContactData(datosContacto);
  },
});

/**
 * Tool para extraer entidades técnicas de texto
 */
export const extractTechnicalEntitiesTool = createTool({
  id: 'extract-technical-entities',
  description: 'Extrae entidades técnicas (material, cantidad, tolerancia, etc.) de un texto',
  inputSchema: z.object({
    text: z.string().describe('Texto del cual extraer entidades'),
  }),
  outputSchema: z.object({
    material: z.string().optional(),
    cantidad: z.number().optional(),
    tolerancia: z.string().optional(),
    plazo_semanas: z.number().optional(),
    tratamientos: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const { text } = context;
    const entities: any = {};

    const textLower = text.toLowerCase();

    // Extraer material
    const materialPatterns = [
      { pattern: /aluminio\s*6061/gi, material: 'Aluminio 6061' },
      { pattern: /aluminio\s*7075/gi, material: 'Aluminio 7075' },
      { pattern: /acero\s*f-?1140/gi, material: 'Acero F-1140' },
      { pattern: /acero\s*inoxidable\s*304/gi, material: 'Acero Inoxidable 304' },
      { pattern: /acero\s*inoxidable\s*316/gi, material: 'Acero Inoxidable 316' },
      { pattern: /titanio/gi, material: 'Titanio Grado 5' },
    ];

    for (const { pattern, material } of materialPatterns) {
      if (pattern.test(text)) {
        entities.material = material;
        break;
      }
    }

    // Extraer cantidad
    const quantityMatch = text.match(/(\d+)\s*(pieza|unidad|pza)/i);
    if (quantityMatch) {
      entities.cantidad = parseInt(quantityMatch[1]);
    }

    // Extraer tolerancia
    const toleranceMatch = text.match(/(ISO\s*2768-?[fmcv]|±\s*[\d.]+\s*mm)/i);
    if (toleranceMatch) {
      entities.tolerancia = toleranceMatch[1];
    }

    // Extraer plazo
    const deadlineMatch = text.match(/(\d+)\s*semana/i);
    if (deadlineMatch) {
      entities.plazo_semanas = parseInt(deadlineMatch[1]);
    }

    // Extraer tratamientos
    const tratamientos: string[] = [];
    const tratamientoPatterns = [
      { pattern: /anodizado/gi, tratamiento: 'anodizado' },
      { pattern: /cromado/gi, tratamiento: 'cromado' },
      { pattern: /temple/gi, tratamiento: 'temple' },
      { pattern: /nitrurado/gi, tratamiento: 'nitrurado' },
      { pattern: /galvanizado/gi, tratamiento: 'galvanizado' },
      { pattern: /pintura/gi, tratamiento: 'pintura' },
    ];

    for (const { pattern, tratamiento } of tratamientoPatterns) {
      if (pattern.test(text)) {
        tratamientos.push(tratamiento);
      }
    }

    if (tratamientos.length > 0) {
      entities.tratamientos = tratamientos;
    }

    return entities;
  },
});

/**
 * Tool para calcular completitud de solicitud
 */
export const calculateCompletenessTo = createTool({
  id: 'calculate-completeness',
  description: 'Calcula qué tan completa está una solicitud de presupuesto (0-100%)',
  inputSchema: z.object({
    datosTecnicos: BudgetDataSchema,
    datosContacto: ContactDataSchema,
  }),
  outputSchema: z.object({
    completeness: z.number().min(0).max(100),
    technicalScore: z.number(),
    contactScore: z.number(),
    missingCritical: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { datosTecnicos, datosContacto } = context;

    let technicalScore = 0;
    let contactScore = 0;
    const missingCritical: string[] = [];

    // Datos técnicos (60% del total)
    const technicalFields = [
      { field: 'material', weight: 20, critical: true },
      { field: 'cantidad', weight: 20, critical: true },
      { field: 'tolerancia', weight: 10, critical: false },
      { field: 'plazo_semanas', weight: 5, critical: false },
      { field: 'observaciones', weight: 5, critical: false },
    ];

    technicalFields.forEach(({ field, weight, critical }) => {
      if (datosTecnicos[field as keyof typeof datosTecnicos]) {
        technicalScore += weight;
      } else if (critical) {
        missingCritical.push(field);
      }
    });

    // Datos de contacto (40% del total)
    const contactFields = [
      { field: 'email', weight: 20, critical: true },
      { field: 'nombre', weight: 10, critical: true },
      { field: 'empresa', weight: 5, critical: false },
      { field: 'telefono', weight: 5, critical: false },
    ];

    contactFields.forEach(({ field, weight, critical }) => {
      if (datosContacto[field as keyof typeof datosContacto]) {
        contactScore += weight;
      } else if (critical) {
        missingCritical.push(field);
      }
    });

    const completeness = technicalScore + contactScore;

    return {
      completeness,
      technicalScore,
      contactScore,
      missingCritical,
    };
  },
});
