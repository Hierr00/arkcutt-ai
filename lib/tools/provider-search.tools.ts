/**
 * 🔍 PROVIDER SEARCH TOOLS
 * Herramientas para buscar proveedores externos usando Google Places API
 */

import { Client, PlaceInputType } from '@googlemaps/google-maps-services-js';
import { supabase } from '@/lib/supabase';
import { log } from '@/mastra';
import { extractEmailsFromWebsites } from '@/lib/services/email-extractor.service';
import { googlePlacesLimiter, withRateLimit } from '@/lib/rate-limiter';

const mapsClient = new Client({});

export interface ProviderSearchInput {
  service: string; // e.g., "anodizado", "tratamiento térmico"
  material?: string; // e.g., "aluminio", "acero"
  location?: string; // e.g., "Madrid", "Barcelona"
  radius?: number; // Radio en km (default: 50km)
}

export interface ProviderSearchResult {
  name: string;
  address: string;
  phone?: string;
  email?: string; // Email extraído de la website
  website?: string;
  rating?: number;
  totalRatings?: number;
  distanceKm?: number;
  googlePlaceId: string;
  location: {
    lat: number;
    lng: number;
  };
  openNow?: boolean;
  businessHours?: string[];
}

/**
 * Tool 1: Search Providers on Google Places
 * Busca proveedores usando Google Places API
 */
export async function searchProvidersOnGoogle(
  input: ProviderSearchInput
): Promise<ProviderSearchResult[]> {
  try {
    log('info', `🔍 Buscando proveedores de ${input.service} en Google Places`);

    // Construir query de búsqueda
    const query = buildSearchQuery(input);

    // Geocode location first if needed
    const location = input.location
      ? await geocodeLocation(input.location)
      : { lat: 40.4168, lng: -3.7038 }; // Madrid por defecto

    // Usar Places Text Search con rate limiting
    const response = await withRateLimit(
      googlePlacesLimiter,
      () => mapsClient.textSearch({
        params: {
          query,
          key: process.env.GOOGLE_PLACES_API_KEY!,
          location,
          radius: (input.radius || 50) * 1000, // Convertir km a metros
          language: 'es' as any, // Type assertion for language
        },
      }),
      { priority: 7 } // Alta prioridad para búsquedas iniciales
    );

    if (response.data.status !== 'OK') {
      log('warn', `⚠️ Google Places API status: ${response.data.status}`);
      return [];
    }

    const results = response.data.results.map((place) => ({
      name: place.name || '',
      address: place.formatted_address || '',
      phone: place.formatted_phone_number,
      website: place.website,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      googlePlaceId: place.place_id!,
      location: {
        lat: place.geometry!.location.lat,
        lng: place.geometry!.location.lng,
      },
      openNow: place.opening_hours?.open_now,
    }));

    // IMPORTANTE: Text Search no devuelve phone ni website
    // Necesitamos llamar a Place Details para cada uno
    log('info', `🔍 Obteniendo detalles completos de ${results.length} proveedores...`);
    for (let i = 0; i < results.length; i++) {
      try {
        const details = await getProviderDetails(results[i].googlePlaceId);
        results[i].phone = details.phone;
        results[i].website = details.website;
        log('debug', `✅ Detalles obtenidos para ${results[i].name}`);
      } catch (error: any) {
        log('warn', `⚠️ No se pudieron obtener detalles de ${results[i].name}`);
      }
    }

    log('info', `✅ Encontrados ${results.length} proveedores en Google Places`);

    // Extraer emails de las websites
    const providersWithWebsite = results.filter(p => p.website);
    if (providersWithWebsite.length > 0) {
      log('info', `🔍 Extrayendo emails de ${providersWithWebsite.length} websites...`);

      const websites = providersWithWebsite.map(p => p.website!);
      const emailMap = await extractEmailsFromWebsites(websites);

      // Actualizar resultados con emails encontrados
      results.forEach(provider => {
        if (provider.website && emailMap.has(provider.website)) {
          const email = emailMap.get(provider.website);
          if (email) {
            (provider as any).email = email;
            log('debug', `✅ Email encontrado para ${provider.name}: ${email}`);
          }
        }
      });

      const emailsFound = Array.from(emailMap.values()).filter(e => e !== null).length;
      log('info', `✅ ${emailsFound} emails extraídos exitosamente`);
    }

    // Guardar en base de datos para futuras referencias (ahora con emails)
    await saveProvidersToDatabase(results, input.service);

    return results;
  } catch (error: any) {
    log('error', '❌ Error buscando proveedores en Google Places', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Tool 2: Get Provider Details
 * Obtiene detalles completos de un proveedor específico
 */
export async function getProviderDetails(
  googlePlaceId: string
): Promise<{
  name: string;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;
  reviews?: Array<{
    author: string;
    rating: number;
    text: string;
    time: Date;
  }>;
  photos?: string[];
  businessHours?: {
    weekday: number;
    open: string;
    close: string;
  }[];
}> {
  try {
    log('debug', `📋 Obteniendo detalles del proveedor: ${googlePlaceId}`);

    const response = await withRateLimit(
      googlePlacesLimiter,
      () => mapsClient.placeDetails({
        params: {
          place_id: googlePlaceId,
          key: process.env.GOOGLE_PLACES_API_KEY!,
          fields: [
            'name',
            'formatted_address',
            'formatted_phone_number',
            'international_phone_number',
            'website',
            'rating',
            'reviews',
            'photos',
            'opening_hours',
          ],
          language: 'es' as any, // Type assertion for language
        },
      }),
      { priority: 6 } // Prioridad media-alta para detalles
    );

    const place = response.data.result;

    // Intentar extraer email del website (si existe)
    let email: string | undefined;
    if (place.website) {
      email = await extractEmailFromWebsite(place.website);
    }

    return {
      name: place.name || '',
      address: place.formatted_address || '',
      phone:
        place.international_phone_number || place.formatted_phone_number,
      website: place.website,
      email,
      rating: place.rating,
      reviews: place.reviews?.slice(0, 5).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        time: new Date(r.time * 1000),
      })),
      businessHours: place.opening_hours?.periods?.map((p: any) => ({
        weekday: p.open.day,
        open: `${p.open.hours}:${p.open.minutes}`,
        close: `${p.close?.hours}:${p.close?.minutes}`,
      })),
    };
  } catch (error: any) {
    log('error', '❌ Error obteniendo detalles del proveedor', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Tool 3: Search in Knowledge Base First
 * Busca primero en nuestra base de conocimiento antes de ir a Google
 */
export async function searchProvidersInDatabase(
  service: string,
  material?: string
): Promise<any[]> {
  try {
    log('debug', `🗄️ Buscando proveedores de ${service} en base de datos`);

    const { data, error } = await supabase
      .from('provider_contacts')
      .select('*')
      .contains('services', [service])
      .eq('is_active', true)
      .order('reliability_score', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Filtrar por material si se especifica
    let results = data || [];
    if (material && results.length > 0) {
      results = results.filter(
        (p) => !p.materials || p.materials.includes(material)
      );
    }

    log('info', `✅ Encontrados ${results.length} proveedores en base de datos`);

    return results;
  } catch (error: any) {
    log('error', '❌ Error buscando en base de datos', {
      error: error.message,
    });
    return [];
  }
}

/**
 * Tool 4: Combined Provider Search
 * Busca primero en BD, luego en Google si es necesario
 */
export async function findProviders(
  input: ProviderSearchInput
): Promise<{
  fromDatabase: any[];
  fromGoogle: ProviderSearchResult[];
  total: number;
}> {
  try {
    log('info', `🔎 Buscando proveedores de ${input.service}`);

    // PASO 1: Buscar en base de datos
    const dbProviders = await searchProvidersInDatabase(
      input.service,
      input.material
    );

    // PASO 2: Si no hay suficientes en BD, buscar en Google
    let googleProviders: ProviderSearchResult[] = [];
    if (dbProviders.length < 3) {
      googleProviders = await searchProvidersOnGoogle(input);
    }

    log('info', `✅ Total: ${dbProviders.length + googleProviders.length} proveedores encontrados`);

    return {
      fromDatabase: dbProviders,
      fromGoogle: googleProviders,
      total: dbProviders.length + googleProviders.length,
    };
  } catch (error: any) {
    log('error', '❌ Error en búsqueda combinada', { error: error.message });
    throw error;
  }
}

/**
 * Helper: Build Search Query
 * Construye la query de búsqueda para Google Places
 */
function buildSearchQuery(input: ProviderSearchInput): string {
  const parts = [];

  // Servicio principal
  parts.push(input.service);

  // Material si se especifica
  if (input.material) {
    parts.push(input.material);
  }

  // Añadir contexto industrial
  parts.push('industrial');
  parts.push('taller');

  // Ubicación
  if (input.location) {
    parts.push(input.location);
  }

  return parts.join(' ');
}

/**
 * Helper: Geocode Location
 * Convierte un nombre de ciudad en coordenadas
 */
async function geocodeLocation(
  location: string
): Promise<{ lat: number; lng: number }> {
  try {
    const response = await withRateLimit(
      googlePlacesLimiter,
      () => mapsClient.geocode({
        params: {
          address: location,
          key: process.env.GOOGLE_PLACES_API_KEY!,
        },
      }),
      { priority: 8 } // Alta prioridad, necesario antes de búsquedas
    );

    if (response.data.results.length === 0) {
      // Default a Madrid
      return { lat: 40.4168, lng: -3.7038 };
    }

    return response.data.results[0].geometry.location;
  } catch (error) {
    // Default a Madrid
    return { lat: 40.4168, lng: -3.7038 };
  }
}

/**
 * Helper: Extract Email from Website
 * Intenta extraer email de la página web del proveedor
 */
async function extractEmailFromWebsite(
  website: string
): Promise<string | undefined> {
  try {
    // Hacer fetch de la página
    const response = await fetch(website);
    const html = await response.text();

    // Regex para encontrar emails
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = html.match(emailRegex);

    if (matches && matches.length > 0) {
      // Filtrar emails comunes que no son del proveedor
      const filtered = matches.filter(
        (email) =>
          !email.includes('example.com') &&
          !email.includes('domain.com') &&
          !email.includes('gmail.com') &&
          !email.includes('hotmail.com')
      );

      return filtered[0];
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Helper: Save Providers to Database
 * Guarda proveedores encontrados en Google en nuestra BD
 */
async function saveProvidersToDatabase(
  providers: ProviderSearchResult[],
  service: string
): Promise<void> {
  try {
    const records = providers.map((p) => ({
      name: p.name,
      email: (p as any).email || p.email, // Email extraído de website
      phone: p.phone,
      website: p.website,
      address: p.address,
      google_place_id: p.googlePlaceId,
      services: [service],
      is_active: true,
      reliability_score: p.rating ? p.rating / 5 : 0.5,
      quality_rating: p.rating,
    }));

    // Upsert (insert si no existe, update si existe)
    const { data, error: upsertError } = await supabase.from('provider_contacts').upsert(records, {
      onConflict: 'google_place_id',
      ignoreDuplicates: false,
    });

    if (upsertError) {
      log('error', '❌ Error en upsert de proveedores', {
        error: upsertError.message,
        code: upsertError.code,
        details: upsertError.details
      });
      throw upsertError;
    }

    log('debug', `✅ ${records.length} proveedores guardados en BD`);
  } catch (error: any) {
    log('error', '❌ Error guardando proveedores en BD', {
      error: error.message,
    });
    // No lanzar error, es solo para caché
  }
}

/**
 * Tool Schemas para Mastra
 */
export const providerSearchToolsSchema = {
  findProviders: {
    name: 'findProviders',
    description:
      'Busca proveedores externos para servicios que Arkcutt no realiza (anodizado, tratamientos, etc.)',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description:
            'Servicio que se necesita (ej: anodizado, tratamiento térmico, cromado)',
        },
        material: {
          type: 'string',
          description: 'Material específico (opcional)',
        },
        location: {
          type: 'string',
          description: 'Ubicación donde buscar (opcional, default: Madrid)',
        },
      },
      required: ['service'],
    },
  },
};
