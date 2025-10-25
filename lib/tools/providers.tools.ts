/**
 * 🔧 PROVEEDORES AGENT TOOLS
 * Tool-calling functions for Proveedores Agent
 */

import { supabase } from '@/lib/supabase';
import { searchKnowledge } from '@/lib/services/rag.service';
import { log } from '@/mastra';

/**
 * Tool 1: Search Providers
 * Busca proveedores externos por tipo de servicio
 */
export interface SearchProvidersInput {
  service_type: string; // e.g., "anodizado", "tratamiento térmico", "soldadura"
  material?: string; // Optional: filter by material compatibility
}

export interface ProviderResult {
  provider_name: string;
  services: string[];
  contact_email?: string;
  contact_phone?: string;
  materials_compatible?: string[];
  estimated_time?: string;
  notes?: string;
  relevance_score: number;
}

export async function searchProviders(
  input: SearchProvidersInput
): Promise<ProviderResult[]> {
  try {
    log('debug', `🔍 Searching providers for: ${input.service_type}`);

    const query = input.material
      ? `${input.service_type} para ${input.material}`
      : input.service_type;

    // Search knowledge base for providers
    const results = await searchKnowledge({
      query,
      agent_type: 'providers',
      category: 'provider_info',
      match_count: 5,
      match_threshold: 0.5,
      use_hybrid: false,
    });

    const providers: ProviderResult[] = [];

    for (const result of results) {
      const metadata = result.metadata || {};

      providers.push({
        provider_name: metadata.provider_name || 'Proveedor no especificado',
        services: metadata.services || [],
        contact_email: metadata.contact_email,
        contact_phone: metadata.contact_phone,
        materials_compatible: metadata.materials || [],
        estimated_time: metadata.estimated_time,
        notes: result.content,
        relevance_score: result.similarity,
      });
    }

    return providers;
  } catch (error: any) {
    log('error', 'Failed to search providers', { error: error.message });
    throw error;
  }
}

/**
 * Tool 2: Get Provider Info
 * Obtiene información detallada de un proveedor específico
 */
export interface GetProviderInfoInput {
  provider_name: string;
}

export interface ProviderInfo {
  found: boolean;
  provider_name: string;
  description?: string;
  services?: string[];
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  certifications?: string[];
  materials_compatible?: string[];
  estimated_turnaround?: string;
  quality_notes?: string;
  pricing_notes?: string;
}

export async function getProviderInfo(
  input: GetProviderInfoInput
): Promise<ProviderInfo> {
  try {
    log('debug', `📋 Getting info for provider: ${input.provider_name}`);

    // First try from providers table
    const { data: dbProvider } = await supabase
      .from('providers')
      .select('*')
      .ilike('provider_name', `%${input.provider_name}%`)
      .maybeSingle();

    if (dbProvider) {
      return {
        found: true,
        provider_name: dbProvider.provider_name,
        description: dbProvider.description,
        services: dbProvider.services,
        contact_email: dbProvider.contact_email,
        contact_phone: dbProvider.contact_phone,
        address: dbProvider.address,
        website: dbProvider.website,
        certifications: dbProvider.certifications,
        materials_compatible: dbProvider.materials_compatible,
        estimated_turnaround: dbProvider.estimated_turnaround,
        quality_notes: dbProvider.quality_notes,
        pricing_notes: dbProvider.pricing_notes,
      };
    }

    // Fallback to knowledge base
    const results = await searchKnowledge({
      query: input.provider_name,
      agent_type: 'providers',
      match_count: 1,
      match_threshold: 0.5,
      use_hybrid: false,
    });

    if (results.length === 0) {
      return {
        found: false,
        provider_name: input.provider_name,
      };
    }

    const result = results[0];
    const metadata = result.metadata || {};

    return {
      found: true,
      provider_name: metadata.provider_name || input.provider_name,
      description: result.content,
      services: metadata.services || [],
      contact_email: metadata.contact_email,
      contact_phone: metadata.contact_phone,
      materials_compatible: metadata.materials || [],
      estimated_turnaround: metadata.estimated_time,
    };
  } catch (error: any) {
    log('error', 'Failed to get provider info', { error: error.message });
    throw error;
  }
}

/**
 * Tool 3: Generate Provider Email
 * Genera un email profesional para solicitar cotización a un proveedor
 */
export interface GenerateProviderEmailInput {
  provider_name: string;
  service_requested: string;
  material: string;
  quantity?: number;
  technical_specs?: string;
  deadline?: string;
  customer_company?: string;
}

export interface ProviderEmail {
  subject: string;
  body: string;
  to_email?: string;
  cc_emails?: string[];
}

export async function generateProviderEmail(
  input: GenerateProviderEmailInput
): Promise<ProviderEmail> {
  try {
    log('debug', `📧 Generating email for provider: ${input.provider_name}`);

    // Get provider contact info
    const providerInfo = await getProviderInfo({
      provider_name: input.provider_name,
    });

    const subject = `Solicitud de Cotización - ${input.service_requested} - ${input.material}`;

    const body = `Estimados señores de ${input.provider_name},

Somos Arkcutt, empresa especializada en mecanizado CNC de metales de alta precisión. Actualmente estamos trabajando en un proyecto para ${input.customer_company || 'uno de nuestros clientes'} y necesitamos cotizar el siguiente servicio:

**SERVICIO REQUERIDO:**
${input.service_requested}

**MATERIAL:**
${input.material}

${input.quantity ? `**CANTIDAD:**\n${input.quantity} pieza(s)\n` : ''}
${input.technical_specs ? `**ESPECIFICACIONES TÉCNICAS:**\n${input.technical_specs}\n` : ''}
${input.deadline ? `**PLAZO REQUERIDO:**\n${input.deadline}\n` : ''}

**INFORMACIÓN ADICIONAL:**
- Las piezas ya vienen mecanizadas desde nuestras instalaciones
- Requerimos certificados de calidad del proceso
- El material será entregado en nuestras instalaciones en [CIUDAD]

¿Podrían enviarnos:
1. Cotización del servicio solicitado
2. Tiempos de entrega estimados
3. Certificaciones disponibles
4. Condiciones de pago

Quedamos atentos a su respuesta.

Saludos cordiales,

**Departamento de Ingeniería**
Arkcutt - Mecanizados de Precisión
Tel: [TELÉFONO]
Email: ingenieria@arkcutt.com
Web: www.arkcutt.com`;

    return {
      subject,
      body,
      to_email: providerInfo.contact_email,
      cc_emails: ['ingenieria@arkcutt.com'],
    };
  } catch (error: any) {
    log('error', 'Failed to generate provider email', { error: error.message });
    throw error;
  }
}

/**
 * Tool 4: Get Material Supplier Email
 * Genera un email para solicitar material a un proveedor de materiales
 */
export interface GetMaterialSupplierEmailInput {
  material_code: string;
  material_name: string;
  quantity_kg?: number;
  dimensions?: string;
  deadline?: string;
  project_reference?: string;
}

export interface MaterialSupplierEmail {
  subject: string;
  body: string;
  supplier_email?: string;
  supplier_name?: string;
}

export async function getMaterialSupplierEmail(
  input: GetMaterialSupplierEmailInput
): Promise<MaterialSupplierEmail> {
  try {
    log('debug', `📧 Generating material order email for: ${input.material_code}`);

    // Search for material supplier
    const results = await searchKnowledge({
      query: `proveedor ${input.material_code}`,
      agent_type: 'material',
      category: 'suppliers',
      match_count: 1,
      match_threshold: 0.5,
      use_hybrid: false,
    });

    const supplierName = results[0]?.metadata?.supplier_name || 'Proveedor de Material';
    const supplierEmail = results[0]?.metadata?.contact_email;

    const subject = `Pedido de Material - ${input.material_code} - ${input.material_name}`;

    const body = `Estimados señores de ${supplierName},

Somos Arkcutt, empresa especializada en mecanizado CNC de metales de alta precisión. Necesitamos realizar un pedido del siguiente material:

**MATERIAL SOLICITADO:**
- Código: ${input.material_code}
- Descripción: ${input.material_name}
${input.quantity_kg ? `- Cantidad: ${input.quantity_kg} kg\n` : ''}
${input.dimensions ? `- Dimensiones: ${input.dimensions}\n` : ''}
${input.project_reference ? `- Referencia de proyecto: ${input.project_reference}\n` : ''}

**REQUISITOS:**
- Certificado de material según norma
- Certificado de trazabilidad
- Albarán de entrega
${input.deadline ? `- Fecha límite de entrega: ${input.deadline}\n` : ''}

**ENTREGA:**
Dirección: [DIRECCIÓN DE ARKCUTT]
Horario: L-V 8:00-17:00h

¿Podrían confirmar:
1. Disponibilidad del material
2. Precio y condiciones de pago
3. Plazo de entrega
4. Documentación incluida

Quedamos a la espera de su confirmación.

Saludos cordiales,

**Departamento de Compras**
Arkcutt - Mecanizados de Precisión
Tel: [TELÉFONO]
Email: compras@arkcutt.com
Web: www.arkcutt.com`;

    return {
      subject,
      body,
      supplier_email: supplierEmail,
      supplier_name: supplierName,
    };
  } catch (error: any) {
    log('error', 'Failed to generate material supplier email', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Tool 5: Check If Service Is External
 * Verifica si un servicio debe ser subcontratado (Arkcutt solo hace CNC)
 */
export interface CheckIfServiceIsExternalInput {
  service_description: string;
}

export interface ServiceClassification {
  is_external: boolean;
  service_type: string;
  reason: string;
  suggested_action: string;
}

export async function checkIfServiceIsExternal(
  input: CheckIfServiceIsExternalInput
): Promise<ServiceClassification> {
  try {
    log('debug', `🔍 Classifying service: ${input.service_description}`);

    // List of services Arkcutt DOES do
    const internalServices = [
      'mecanizado',
      'fresado',
      'torneado',
      'taladrado',
      'cnc',
      'mecanizar',
      'fresar',
      'tornear',
    ];

    // List of services that are EXTERNAL
    const externalServices = [
      'anodizado',
      'anodizar',
      'cromado',
      'cromar',
      'niquelado',
      'niquelar',
      'pintura',
      'pintar',
      'tratamiento térmico',
      'temple',
      'templar',
      'revenido',
      'soldadura',
      'soldar',
      'corte láser',
      'corte plasma',
      'fundición',
      'fundir',
      'forja',
      'forjar',
      'estampación',
      'estampar',
      'doblado',
      'doblar',
      'plegado',
      'plegar',
      'certificación',
      'certificar',
      'ensayo',
    ];

    const lowerService = input.service_description.toLowerCase();

    // IMPORTANT: Check for external services FIRST
    // If any external service is mentioned, it's external (even if also mentions internal)
    for (const service of externalServices) {
      if (lowerService.includes(service)) {
        return {
          is_external: true,
          service_type: service,
          reason: `Arkcutt NO realiza ${service}. Servicio debe ser subcontratado.`,
          suggested_action: `Buscar proveedor externo especializado en ${service}`,
        };
      }
    }

    // Check if it's ONLY internal service
    for (const service of internalServices) {
      if (lowerService.includes(service)) {
        return {
          is_external: false,
          service_type: 'Mecanizado CNC',
          reason: 'Arkcutt realiza todos los servicios de mecanizado CNC de metales',
          suggested_action: 'Procesar internamente',
        };
      }
    }

    // If uncertain, search knowledge base
    const results = await searchKnowledge({
      query: input.service_description,
      agent_type: 'providers',
      category: 'provider_notes',
      match_count: 1,
      match_threshold: 0.6,
      use_hybrid: false,
    });

    if (results.length > 0 && results[0].content.includes('NO realizamos')) {
      return {
        is_external: true,
        service_type: input.service_description,
        reason: 'Servicio identificado como externo en base de conocimiento',
        suggested_action: 'Buscar proveedor externo',
      };
    }

    // Default: assume external if not clearly internal
    return {
      is_external: true,
      service_type: input.service_description,
      reason: 'Servicio no identificado como parte de las capacidades de mecanizado CNC',
      suggested_action: 'Verificar con cliente y buscar proveedor si es necesario',
    };
  } catch (error: any) {
    log('error', 'Failed to classify service', { error: error.message });
    throw error;
  }
}

/**
 * Tool Schema Definitions for AI Tool Calling
 */
export const providersToolsSchema = {
  searchProviders: {
    name: 'searchProviders',
    description:
      'Busca proveedores externos por tipo de servicio (tratamientos, soldaduras, etc). IMPORTANTE: Arkcutt solo hace mecanizado CNC, todos los demás servicios son externos.',
    parameters: {
      type: 'object',
      properties: {
        service_type: {
          type: 'string',
          description:
            'Tipo de servicio (ej: "anodizado", "tratamiento térmico", "soldadura")',
        },
        material: {
          type: 'string',
          description: 'Material (opcional, para filtrar compatibilidad)',
        },
      },
      required: ['service_type'],
    },
  },
  getProviderInfo: {
    name: 'getProviderInfo',
    description:
      'Obtiene información detallada de un proveedor específico (contacto, servicios, certificaciones)',
    parameters: {
      type: 'object',
      properties: {
        provider_name: {
          type: 'string',
          description: 'Nombre del proveedor',
        },
      },
      required: ['provider_name'],
    },
  },
  generateProviderEmail: {
    name: 'generateProviderEmail',
    description:
      'Genera un email profesional para solicitar cotización a un proveedor externo',
    parameters: {
      type: 'object',
      properties: {
        provider_name: {
          type: 'string',
          description: 'Nombre del proveedor',
        },
        service_requested: {
          type: 'string',
          description: 'Servicio que se solicita',
        },
        material: {
          type: 'string',
          description: 'Material de las piezas',
        },
        quantity: {
          type: 'number',
          description: 'Cantidad de piezas',
        },
        technical_specs: {
          type: 'string',
          description: 'Especificaciones técnicas adicionales',
        },
        deadline: {
          type: 'string',
          description: 'Plazo requerido',
        },
        customer_company: {
          type: 'string',
          description: 'Nombre de la empresa cliente',
        },
      },
      required: ['provider_name', 'service_requested', 'material'],
    },
  },
  getMaterialSupplierEmail: {
    name: 'getMaterialSupplierEmail',
    description:
      'Genera un email para pedir material a un proveedor de materiales',
    parameters: {
      type: 'object',
      properties: {
        material_code: {
          type: 'string',
          description: 'Código del material',
        },
        material_name: {
          type: 'string',
          description: 'Nombre del material',
        },
        quantity_kg: {
          type: 'number',
          description: 'Cantidad en kg',
        },
        dimensions: {
          type: 'string',
          description: 'Dimensiones requeridas',
        },
        deadline: {
          type: 'string',
          description: 'Fecha límite',
        },
      },
      required: ['material_code', 'material_name'],
    },
  },
  checkIfServiceIsExternal: {
    name: 'checkIfServiceIsExternal',
    description:
      'Verifica si un servicio debe ser subcontratado. Usa SIEMPRE que el cliente mencione un servicio que no sea mecanizado CNC.',
    parameters: {
      type: 'object',
      properties: {
        service_description: {
          type: 'string',
          description: 'Descripción del servicio solicitado',
        },
      },
      required: ['service_description'],
    },
  },
};
