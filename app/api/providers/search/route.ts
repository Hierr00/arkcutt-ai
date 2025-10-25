/**
 * 🔍 API: Provider Search
 * Búsqueda de proveedores usando Google Places API
 */

import { NextRequest, NextResponse } from 'next/server';
import { findProviders } from '@/lib/tools/provider-search.tools';

export const dynamic = 'force-dynamic';

/**
 * POST /api/providers/search
 * Busca proveedores usando Google Places API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, location, radius } = body;

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'service is required' },
        { status: 400 }
      );
    }

    // Buscar proveedores
    const results = await findProviders({
      service,
      material: body.material,
      location: location || 'Madrid',
      radius: radius || 50,
    });

    // Formatear resultados para el frontend
    const providers = [
      ...results.fromDatabase.map((p: any) => ({
        name: p.name,
        address: p.address,
        city: p.city,
        phone: p.phone,
        website: p.website,
        rating: p.quality_rating,
        googlePlaceId: p.google_place_id,
        source: 'database',
      })),
      ...results.fromGoogle.map((p: any) => ({
        name: p.name,
        address: p.formatted_address,
        city: p.vicinity,
        phone: p.formatted_phone_number,
        website: p.website,
        rating: p.rating,
        googlePlaceId: p.place_id,
        source: 'google',
      })),
    ];

    return NextResponse.json({
      success: true,
      providers,
      total: providers.length,
      fromDatabase: results.fromDatabase.length,
      fromGoogle: results.fromGoogle.length,
    });
  } catch (error: any) {
    console.error('Error searching providers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
