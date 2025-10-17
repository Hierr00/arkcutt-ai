/**
 * 🛠️ TOOL: Services Database
 * Búsqueda de servicios externos (tratamientos, soldaduras, etc.)
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';
import { SERVICES_DB } from '@/lib/constants';

/**
 * Tool para búsqueda de servicios
 */
export const serviceSearchTool = createTool({
  id: 'service-search',
  description: 'Busca información sobre servicios externos disponibles (tratamientos, soldaduras, etc.)',
  inputSchema: z.object({
    servicio: z.string().describe('Nombre del servicio a buscar (ej: "anodizado")'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    service: z.any().optional(),
    suggestions: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const { servicio } = context;
    const servicioKey = servicio.toLowerCase().replace(/\s+/g, '_');

    // Búsqueda exacta
    if (SERVICES_DB[servicioKey]) {
      return {
        found: true,
        service: SERVICES_DB[servicioKey],
      };
    }

    // Búsqueda aproximada
    const suggestions = Object.keys(SERVICES_DB).filter((key) =>
      key.includes(servicioKey.split('_')[0]) ||
      SERVICES_DB[key].nombre.toLowerCase().includes(servicio.toLowerCase())
    );

    return {
      found: false,
      suggestions: suggestions.map((key) => SERVICES_DB[key].nombre),
    };
  },
});

/**
 * Tool para listar servicios por categoría
 */
export const listServicesByCategoryTool = createTool({
  id: 'list-services-by-category',
  description: 'Lista todos los servicios de una categoría específica',
  inputSchema: z.object({
    categoria: z.enum([
      'tratamiento_termico',
      'tratamiento_superficial',
      'soldadura',
      'fundicion',
      'otro',
    ]),
  }),
  outputSchema: z.object({
    servicios: z.array(z.any()),
  }),
  execute: async ({ context }) => {
    const { categoria } = context;

    const servicios = Object.values(SERVICES_DB).filter(
      (service) => service.categoria === categoria
    );

    return { servicios };
  },
});

/**
 * Tool para verificar compatibilidad material-servicio
 */
export const checkServiceCompatibilityTool = createTool({
  id: 'check-service-compatibility',
  description: 'Verifica si un servicio es compatible con un material específico',
  inputSchema: z.object({
    servicio: z.string().describe('Nombre del servicio'),
    material: z.string().describe('Nombre del material'),
  }),
  outputSchema: z.object({
    compatible: z.boolean(),
    notas: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { servicio, material } = context;

    const servicioKey = servicio.toLowerCase().replace(/\s+/g, '_');
    const service = SERVICES_DB[servicioKey];

    if (!service) {
      return {
        compatible: false,
        notas: 'Servicio no encontrado en la base de datos',
      };
    }

    // Check si el material está en la lista de materiales aplicables
    const materialLower = material.toLowerCase();
    const compatible = service.materiales_aplicables.some((mat) =>
      mat.toLowerCase().includes(materialLower) ||
      materialLower.includes(mat.toLowerCase())
    );

    return {
      compatible,
      notas: compatible
        ? `${service.nombre} es compatible con ${material}`
        : `${service.nombre} puede no ser aplicable a ${material}. Materiales típicos: ${service.materiales_aplicables.join(', ')}`,
    };
  },
});
