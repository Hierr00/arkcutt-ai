/**
 * 🎯 API ENDPOINT: Create Quotation Request (Called by Fin)
 *
 * ARKCUTT CORTE LÁSER - Barcelona y Madrid
 *
 * Cuando Fin recopila toda la información necesaria de un cliente de corte láser,
 * llama a este endpoint para crear la quotation request en la BD.
 *
 * @version 2.0.0 - Adaptado para servicios de corte láser
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  CreateQuotationFromFinSchema,
  type CreateQuotationFromFinResponse,
} from '@/lib/types/fin-quotation.types';

/**
 * GET handler - Returns endpoint info
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      endpoint: 'create-quotation-request',
      method: 'POST',
      description: 'Creates laser cutting quotation requests from Fin (Arkcutt)',
      service: 'corte_laser',
      locations: ['Madrid', 'Barcelona'],
      status: 'active',
      authentication: 'Bearer token required',
    },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}

/**
 * POST /api/fin/create-quotation-request
 * Crea quotation request y dispara flujo de proveedores
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Autenticación (Bearer token)
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== process.env.FIN_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 2. Validar request body
    const body = await req.json();
    const validatedData = CreateQuotationFromFinSchema.parse(body);

    console.log('[create-quotation-request] Request received:', {
      customer: validatedData.customer_email,
      city: validatedData.city,
      material: validatedData.material,
      delivery: validatedData.delivery_method,
    });

    // 3. Verificar que supabaseAdmin esté disponible
    if (!supabaseAdmin) {
      console.error('[create-quotation-request] supabaseAdmin not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Database configuration error',
          message: 'SUPABASE_SERVICE_ROLE_KEY not configured',
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 4. Crear quotation_request en la BD
    const { data: quotationRequest, error: createError } = await supabaseAdmin
      .from('quotation_requests')
      .insert({
        customer_email: validatedData.customer_email,
        customer_name: validatedData.customer_name,
        customer_company: validatedData.customer_company,

        // Información específica de corte láser
        parts_description: validatedData.design_description || 'Diseño adjunto en archivo',
        material_requested: validatedData.material,

        status: 'pending',
        conversation_thread_id: validatedData.thread_id,
        external_id: `${validatedData.conversation_id || 'fin'}-${Date.now()}`,
        attachments: validatedData.attachments || [],
        last_interaction: new Date().toISOString(),

        agent_analysis: {
          source: 'fin_intercom',
          service_type: 'corte_laser',
          city: validatedData.city,
          material_provider: validatedData.material_provider,
          delivery_method: validatedData.delivery_method,
          has_design_file: !!validatedData.design_file_url,
          design_file_url: validatedData.design_file_url,
          design_measurements: validatedData.design_measurements,
          design_reference_images: validatedData.design_reference_images,
          delivery_address: validatedData.delivery_address,
          delivery_date_preference: validatedData.delivery_date_preference,
          additional_notes: validatedData.additional_notes,
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (createError) {
      console.error('[create-quotation-request] Error creating quotation:', createError);
      throw createError;
    }

    console.log('[create-quotation-request] Quotation request created:', quotationRequest.id);

    // 5. Determinar información de recogida según ciudad
    let pickupInfo;
    if (validatedData.delivery_method === 'recogida_madrid') {
      pickupInfo = {
        address: 'C. de las Hileras, 18, Centro, 28013 Madrid',
        schedule: 'Lunes a Viernes: 9:00 - 18:00 hora española',
      };
    } else if (validatedData.delivery_method === 'recogida_barcelona') {
      pickupInfo = {
        address: 'Carrer de la ciutat d\'asunció, 16, San Andrés de Palomar, 08030 Barcelona',
        schedule: 'Lunes a Viernes: 9:00 - 18:00 hora española',
      };
    }

    // 6. Generar mensaje para el cliente
    let customerMessage = '';

    if (validatedData.design_file_url) {
      customerMessage = `¡Perfecto! He recibido tu solicitud de corte láser en ${validatedData.city}.`;
    } else {
      customerMessage = `¡Perfecto! He recibido tu solicitud de corte láser en ${validatedData.city}. Como no tienes archivo DXF, nuestro equipo te contactará para ayudarte con el diseño (se cobrará aparte).`;
    }

    // Añadir info de material
    if (validatedData.material_provider === 'arkcutt') {
      customerMessage += ` Usaremos ${validatedData.material} de nuestro stock.`;
    } else {
      customerMessage += ` Recuerda traer tu material compatible con corte láser CO2.`;
    }

    // Añadir info de entrega
    if (validatedData.delivery_method === 'envio_domicilio') {
      customerMessage += ` Realizaremos el envío a la dirección proporcionada (se cobrará el envío aparte).`;
    } else {
      customerMessage += ` Podrás recoger tu pedido en nuestro taller de ${validatedData.city}.`;
    }

    customerMessage += ` Nuestro equipo revisará tu solicitud y te enviará el presupuesto en un máximo de 24 horas laborables (L-V: 9:00-18:00).`;

    const responseTime = Date.now() - startTime;

    // 7. Respuesta a Fin
    const response: CreateQuotationFromFinResponse = {
      success: true,
      quotation_request_id: quotationRequest.id,
      status: 'pending_review',
      message: 'Laser cutting quotation request created successfully',
      order_summary: {
        city: validatedData.city,
        material_provider: validatedData.material_provider,
        material: validatedData.material,
        has_design_file: !!validatedData.design_file_url,
        delivery_method: validatedData.delivery_method,
      },
      customer_message: customerMessage,
      estimated_response_time: '24 horas laborables',
      pickup_info: pickupInfo,
    };

    console.log('[create-quotation-request] Success:', {
      quotation_id: quotationRequest.id,
      city: validatedData.city,
      response_time_ms: responseTime,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Response-Time': `${responseTime}ms`,
      },
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    console.error('[create-quotation-request] Error:', {
      error: error.message,
      stack: error.stack,
    });

    // Error de validación
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Error genérico
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );
  }
}
