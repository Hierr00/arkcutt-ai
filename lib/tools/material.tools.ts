/**
 * 🔧 MATERIAL AGENT TOOLS
 * Tool-calling functions for Material Agent
 */

import { supabase } from '@/lib/supabase';
import { searchKnowledge } from '@/lib/services/rag.service';
import { log } from '@/mastra';

/**
 * Tool 1: Check Material Stock
 * Checks if a specific material is in stock
 */
export interface CheckMaterialStockInput {
  material_code: string; // e.g., "AA7075", "SS316L", "Ti-6Al-4V"
}

export interface MaterialStockResult {
  available: boolean;
  material_code: string;
  material_name: string;
  quantity_kg?: number;
  quantity_sheets?: number;
  dimensions?: string[];
  supplier?: string;
  last_updated?: string;
  notes?: string;
}

export async function checkMaterialStock(
  input: CheckMaterialStockInput
): Promise<MaterialStockResult> {
  try {
    log('debug', `🔍 Checking stock for material: ${input.material_code}`);

    const { data, error } = await supabase
      .from('material_inventory')
      .select('*')
      .ilike('material_code', input.material_code)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check stock: ${error.message}`);
    }

    if (!data) {
      return {
        available: false,
        material_code: input.material_code,
        material_name: input.material_code,
        notes: 'Material no encontrado en inventario',
      };
    }

    return {
      available: data.quantity_kg > 0 || data.quantity_sheets > 0,
      material_code: data.material_code,
      material_name: data.material_name,
      quantity_kg: data.quantity_kg,
      quantity_sheets: data.quantity_sheets,
      dimensions: data.dimensions,
      supplier: data.supplier,
      last_updated: data.updated_at,
      notes: data.notes,
    };
  } catch (error: any) {
    log('error', 'Failed to check material stock', { error: error.message });
    throw error;
  }
}

/**
 * Tool 2: Get Material Properties
 * Retrieves detailed technical properties of a material
 */
export interface GetMaterialPropertiesInput {
  material_query: string; // e.g., "aluminio 7075", "acero inoxidable 316L"
}

export interface MaterialProperties {
  material_name: string;
  properties: {
    tensile_strength_mpa?: number;
    yield_strength_mpa?: number;
    hardness?: string;
    density?: string;
    machinability?: string;
  };
  applications: string[];
  advantages: string[];
  limitations: string[];
  source_docs: Array<{
    content: string;
    similarity: number;
  }>;
}

export async function getMaterialProperties(
  input: GetMaterialPropertiesInput
): Promise<MaterialProperties> {
  try {
    log('debug', `📊 Getting properties for: ${input.material_query}`);

    // Search knowledge base for material properties
    const results = await searchKnowledge({
      query: input.material_query,
      agent_type: 'material',
      category: 'properties',
      match_count: 3,
      match_threshold: 0.6,
      use_hybrid: false,
    });

    if (results.length === 0) {
      return {
        material_name: input.material_query,
        properties: {},
        applications: [],
        advantages: [],
        limitations: [],
        source_docs: [],
      };
    }

    // Extract structured data from top result
    const topResult = results[0];
    const metadata = topResult.metadata || {};

    return {
      material_name: metadata.material_name || input.material_query,
      properties: {
        tensile_strength_mpa: metadata.tensile_strength_mpa,
        yield_strength_mpa: metadata.yield_strength_mpa,
        hardness: metadata.hardness,
        density: metadata.density,
        machinability: metadata.machinability,
      },
      applications: metadata.applications || [],
      advantages: metadata.advantages || [],
      limitations: metadata.limitations || [],
      source_docs: results.map((r) => ({
        content: r.content,
        similarity: r.similarity,
      })),
    };
  } catch (error: any) {
    log('error', 'Failed to get material properties', { error: error.message });
    throw error;
  }
}

/**
 * Tool 3: Find Material Supplier
 * Finds supplier contact information for a specific material
 */
export interface FindMaterialSupplierInput {
  material_code: string; // e.g., "AA7075", "SS316L"
}

export interface MaterialSupplier {
  found: boolean;
  supplier_name?: string;
  contact_email?: string;
  contact_phone?: string;
  materials_supplied?: string[];
  notes?: string;
  source_relevance?: number;
}

export async function findMaterialSupplier(
  input: FindMaterialSupplierInput
): Promise<MaterialSupplier> {
  try {
    log('debug', `🔍 Finding supplier for: ${input.material_code}`);

    // Search knowledge base for supplier information
    const results = await searchKnowledge({
      query: `proveedor ${input.material_code}`,
      agent_type: 'material',
      category: 'suppliers',
      match_count: 1,
      match_threshold: 0.5,
      use_hybrid: false,
    });

    if (results.length === 0) {
      return {
        found: false,
        notes: `No se encontró proveedor para ${input.material_code}`,
      };
    }

    const supplier = results[0];
    const metadata = supplier.metadata || {};

    return {
      found: true,
      supplier_name: metadata.supplier_name,
      contact_email: metadata.contact_email,
      contact_phone: metadata.contact_phone,
      materials_supplied: metadata.materials_supplied || [],
      notes: supplier.content,
      source_relevance: supplier.similarity,
    };
  } catch (error: any) {
    log('error', 'Failed to find material supplier', { error: error.message });
    throw error;
  }
}

/**
 * Tool 4: Suggest Alternative Materials
 * Suggests alternative materials based on requirements
 */
export interface SuggestAlternativesInput {
  original_material: string;
  requirements: string; // Description of application/requirements
  max_alternatives?: number;
}

export interface MaterialAlternative {
  material_name: string;
  material_code?: string;
  similarity_score: number;
  advantages: string[];
  trade_offs: string[];
  recommended: boolean;
}

export async function suggestAlternatives(
  input: SuggestAlternativesInput
): Promise<MaterialAlternative[]> {
  try {
    log('debug', `🔄 Suggesting alternatives to: ${input.original_material}`);

    const query = `alternativa a ${input.original_material} para ${input.requirements}`;

    // Search for similar materials
    const results = await searchKnowledge({
      query,
      agent_type: 'material',
      category: 'properties',
      match_count: input.max_alternatives || 3,
      match_threshold: 0.5,
      use_hybrid: false,
    });

    const alternatives: MaterialAlternative[] = [];

    for (const result of results) {
      const metadata = result.metadata || {};

      // Skip if it's the same material
      if (
        metadata.material_code?.toLowerCase() ===
        input.original_material.toLowerCase()
      ) {
        continue;
      }

      alternatives.push({
        material_name: metadata.material_name || result.content.split(':')[0],
        material_code: metadata.material_code,
        similarity_score: result.similarity,
        advantages: metadata.advantages || [],
        trade_offs: metadata.limitations || [],
        recommended: result.similarity > 0.7,
      });
    }

    return alternatives;
  } catch (error: any) {
    log('error', 'Failed to suggest alternatives', { error: error.message });
    throw error;
  }
}

/**
 * Tool Schema Definitions for AI Tool Calling
 * These can be used with OpenAI function calling
 */
export const materialToolsSchema = {
  checkMaterialStock: {
    name: 'checkMaterialStock',
    description:
      'Verifica si un material específico está disponible en inventario. Usa esta herramienta cuando el usuario pregunte por disponibilidad de stock.',
    parameters: {
      type: 'object',
      properties: {
        material_code: {
          type: 'string',
          description:
            'Código del material (ej: AA7075, SS316L, Ti-6Al-4V)',
        },
      },
      required: ['material_code'],
    },
  },
  getMaterialProperties: {
    name: 'getMaterialProperties',
    description:
      'Obtiene propiedades técnicas detalladas de un material (resistencia, dureza, densidad, etc). Usa cuando el usuario necesite especificaciones técnicas.',
    parameters: {
      type: 'object',
      properties: {
        material_query: {
          type: 'string',
          description:
            'Nombre o descripción del material (ej: "aluminio 7075", "acero inoxidable 316L")',
        },
      },
      required: ['material_query'],
    },
  },
  findMaterialSupplier: {
    name: 'findMaterialSupplier',
    description:
      'Encuentra información de contacto del proveedor de un material específico. Usa cuando necesites ordenar material que no está en stock.',
    parameters: {
      type: 'object',
      properties: {
        material_code: {
          type: 'string',
          description: 'Código del material a buscar proveedor',
        },
      },
      required: ['material_code'],
    },
  },
  suggestAlternatives: {
    name: 'suggestAlternatives',
    description:
      'Sugiere materiales alternativos basándose en requisitos de aplicación. Usa cuando el material solicitado no esté disponible o el usuario busque opciones.',
    parameters: {
      type: 'object',
      properties: {
        original_material: {
          type: 'string',
          description: 'Material original solicitado',
        },
        requirements: {
          type: 'string',
          description: 'Descripción de requisitos o aplicación',
        },
        max_alternatives: {
          type: 'number',
          description: 'Número máximo de alternativas a sugerir (default: 3)',
        },
      },
      required: ['original_material', 'requirements'],
    },
  },
};
