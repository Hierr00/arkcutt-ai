/**
 * ⚙️ SETTINGS SERVICE
 * Servicio para obtener configuración de la empresa desde BD
 */

import { supabase } from '@/lib/supabase';
import { log } from '@/mastra';

interface Service {
  name: string;
  key: string;
  description: string;
  materials: string[];
  enabled?: boolean;
  reason?: string;
}

interface CompanySettings {
  internalServices: Service[];
  externalServices: Service[];
  companyInfo: any;
}

// Cache en memoria para evitar consultas repetidas
let settingsCache: CompanySettings | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la configuración actual de la empresa
 * Usa caché para evitar consultas repetidas
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  const now = Date.now();

  // Si tenemos caché válida, usarla
  if (settingsCache && now - lastFetchTime < CACHE_DURATION_MS) {
    return settingsCache;
  }

  try {
    log('info', '⚙️ Fetching company settings from database...');

    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('*');

    if (error) throw error;

    // Convertir array a objeto
    const settingsMap: any = {};
    settings.forEach((setting: any) => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    // Formatear para uso interno
    const formattedSettings: CompanySettings = {
      internalServices: settingsMap.internal_services?.services || [],
      externalServices: settingsMap.external_services?.services || [],
      companyInfo: settingsMap.company_info || {},
    };

    // Actualizar caché
    settingsCache = formattedSettings;
    lastFetchTime = now;

    log('info', `✅ Settings loaded: ${formattedSettings.internalServices.length} internal, ${formattedSettings.externalServices.length} external services`);

    return formattedSettings;
  } catch (error: any) {
    log('error', '❌ Error fetching company settings', { error: error.message });

    // Si falla, retornar configuración por defecto como fallback
    return {
      internalServices: [
        {
          name: 'Mecanizado CNC',
          key: 'cnc_machining',
          description: 'Mecanizado de precisión',
          materials: ['aluminio', 'acero', 'plasticos'],
          enabled: true,
        },
      ],
      externalServices: [
        {
          name: 'Anodizado',
          key: 'anodizing',
          description: 'Anodizado de aluminio',
          materials: ['aluminio'],
          reason: 'Proceso químico especializado',
        },
      ],
      companyInfo: {
        name: 'Arkcutt',
        location: 'Madrid, España',
      },
    };
  }
}

/**
 * Invalida el caché de settings
 * Útil después de actualizar la configuración
 */
export function invalidateSettingsCache(): void {
  settingsCache = null;
  lastFetchTime = 0;
  log('debug', '🔄 Settings cache invalidated');
}

/**
 * Genera el prompt dinámicamente basado en la configuración de BD
 */
export async function generateServicesPrompt(): Promise<string> {
  const settings = await getCompanySettings();

  // Servicios internos habilitados
  const enabledInternalServices = settings.internalServices
    .filter((s) => s.enabled !== false)
    .map((s) => `- ${s.name}: ${s.description}`)
    .join('\n');

  // Servicios externos
  const externalServicesList = settings.externalServices
    .map((s) => `- ${s.name}: ${s.description} (${s.reason})`)
    .join('\n');

  return `
SERVICIOS QUE ${settings.companyInfo.name || 'ARKCUTT'} HACE (internos):
${enabledInternalServices}

SERVICIOS QUE ${settings.companyInfo.name || 'ARKCUTT'} NO HACE (externos, requieren proveedores):
${externalServicesList}
`.trim();
}
