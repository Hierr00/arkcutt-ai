/**
 * 🛠️ TOOL: Material Database
 * Búsqueda y comparación de materiales industriales
 */

import { createTool } from '@mastra/core';
import { z } from 'zod';
import { MATERIALS_DB } from '@/lib/constants';

/**
 * Tool para búsqueda de material
 */
export const materialSearchTool = createTool({
  id: 'material-search',
  description: 'Busca información sobre un material industrial específico',
  inputSchema: z.object({
    material: z.string().describe('Nombre del material a buscar (ej: "aluminio 6061")'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    material: z.any().optional(),
    suggestions: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const { material } = context;
    const materialKey = material.toLowerCase().replace(/\s+/g, '-');

    // Búsqueda exacta
    if (MATERIALS_DB[materialKey]) {
      return {
        found: true,
        material: MATERIALS_DB[materialKey],
      };
    }

    // Búsqueda aproximada
    const suggestions = Object.keys(MATERIALS_DB).filter((key) =>
      key.includes(materialKey.split('-')[0])
    );

    return {
      found: false,
      suggestions: suggestions.map((key) => MATERIALS_DB[key].nombre),
    };
  },
});

/**
 * Tool para comparación de materiales
 */
export const materialCompareTool = createTool({
  id: 'material-compare',
  description: 'Compara las propiedades de dos materiales industriales',
  inputSchema: z.object({
    material1: z.string().describe('Primer material'),
    material2: z.string().describe('Segundo material'),
  }),
  outputSchema: z.object({
    comparison: z.any(),
    recommendation: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { material1, material2 } = context;

    const key1 = material1.toLowerCase().replace(/\s+/g, '-');
    const key2 = material2.toLowerCase().replace(/\s+/g, '-');

    const mat1 = MATERIALS_DB[key1];
    const mat2 = MATERIALS_DB[key2];

    if (!mat1 || !mat2) {
      return {
        comparison: null,
        recommendation: 'No se pudieron encontrar ambos materiales en la base de datos',
      };
    }

    const comparison = {
      material1: {
        nombre: mat1.nombre,
        categoria: mat1.categoria,
        propiedades: mat1.propiedades,
        precio: mat1.precio_relativo,
      },
      material2: {
        nombre: mat2.nombre,
        categoria: mat2.categoria,
        propiedades: mat2.propiedades,
        precio: mat2.precio_relativo,
      },
      diferencias: {
        resistencia: `${mat1.nombre} vs ${mat2.nombre}`,
        precio: `${mat1.precio_relativo} vs ${mat2.precio_relativo}`,
        corrosion: `${mat1.propiedades.resistencia_corrosion} vs ${mat2.propiedades.resistencia_corrosion}`,
      },
    };

    // Generar recomendación básica
    let recommendation = '';
    if (mat1.precio_relativo === 'bajo' && mat2.precio_relativo !== 'bajo') {
      recommendation = `${mat1.nombre} es más económico. `;
    }
    if (
      mat1.propiedades.resistencia_corrosion === 'Excelente' &&
      mat2.propiedades.resistencia_corrosion !== 'Excelente'
    ) {
      recommendation += `${mat1.nombre} tiene mejor resistencia a la corrosión.`;
    }

    return {
      comparison,
      recommendation,
    };
  },
});

/**
 * Tool para recomendar material según aplicación
 */
export const materialRecommendTool = createTool({
  id: 'material-recommend',
  description: 'Recomienda materiales según la aplicación y requisitos',
  inputSchema: z.object({
    aplicacion: z.string().describe('Aplicación o uso del material'),
    requisitos: z
      .array(z.string())
      .optional()
      .describe('Requisitos específicos (ej: "resistencia a corrosión")'),
  }),
  outputSchema: z.object({
    recomendaciones: z.array(
      z.object({
        material: z.string(),
        razon: z.string(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { aplicacion, requisitos = [] } = context;
    const recomendaciones: Array<{ material: string; razon: string }> = [];

    const aplicacionLower = aplicacion.toLowerCase();
    const requisitosLower = requisitos.map((r) => r.toLowerCase());

    // Lógica de recomendación basada en keywords
    Object.entries(MATERIALS_DB).forEach(([_, mat]) => {
      let score = 0;
      let razones: string[] = [];

      // Check aplicaciones
      mat.aplicaciones.forEach((app) => {
        if (aplicacionLower.includes(app.toLowerCase()) || app.toLowerCase().includes(aplicacionLower)) {
          score += 2;
          razones.push(`apto para ${app}`);
        }
      });

      // Check requisitos
      requisitosLower.forEach((req) => {
        if (req.includes('corrosion') && mat.propiedades.resistencia_corrosion === 'Excelente') {
          score += 2;
          razones.push('excelente resistencia a corrosión');
        }
        if (req.includes('peso') && mat.categoria === 'aluminio') {
          score += 1;
          razones.push('bajo peso');
        }
        if (req.includes('económico') && mat.precio_relativo === 'bajo') {
          score += 1;
          razones.push('económico');
        }
        if (req.includes('resistencia') && mat.propiedades.resistencia_traccion) {
          score += 1;
          razones.push('buena resistencia mecánica');
        }
      });

      if (score > 0) {
        recomendaciones.push({
          material: mat.nombre,
          razon: razones.join(', '),
        });
      }
    });

    // Ordenar por relevancia
    recomendaciones.sort((a, b) => b.razon.length - a.razon.length);

    // Si no hay recomendaciones específicas, dar algunas generales
    if (recomendaciones.length === 0) {
      recomendaciones.push(
        {
          material: 'Aluminio 6061',
          razon: 'Material versátil para aplicaciones generales',
        },
        {
          material: 'Acero F-1140',
          razon: 'Buena opción económica con excelente maquinabilidad',
        }
      );
    }

    return { recomendaciones: recomendaciones.slice(0, 3) };
  },
});
