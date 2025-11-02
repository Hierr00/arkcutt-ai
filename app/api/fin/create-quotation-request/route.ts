/**
 * 🎯 API ENDPOINT: Create Quotation Request (Called by Fin)
 *
 * Cuando Fin recopila toda la información necesaria de un cliente,
 * llama a este endpoint para crear la quotation request y disparar
 * el flujo de búsqueda de proveedores y envío de RFQs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  CreateQuotationFromFinSchema,
  type CreateQuotationFromFinResponse,
} from '@/lib/types/fin-quotation.types';
import { checkIfServiceIsExternal } from '@/lib/tools/providers.tools';
import { findProviders } from '@/lib/tools/provider-search.tools';
import { sendEmail } from '@/lib/tools/gmail.tools';
import { generateProviderEmail } from '@/lib/tools/providers.tools';

/**
 * GET handler - Returns endpoint info
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      endpoint: 'create-quotation-request',
      method: 'POST',
      description: 'Creates quotation requests from Fin and initiates provider search',
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
      services: validatedData.services.map(s => s.service_type),
      material: validatedData.material_requested,
      quantity: validatedData.quantity,
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
        parts_description: validatedData.parts_description,
        quantity: validatedData.quantity,
        material_requested: validatedData.material_requested,
        tolerances: validatedData.tolerances,
        surface_finish: validatedData.surface_finish,
        delivery_deadline: validatedData.delivery_deadline,
        status: 'pending',
        conversation_thread_id: validatedData.thread_id,
        external_id: validatedData.conversation_id || `fin-${Date.now()}`,
        attachments: validatedData.attachments || [],
        last_interaction: new Date().toISOString(),
        agent_analysis: {
          source: 'fin_intercom',
          services_requested: validatedData.services,
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

    // 5. Clasificar servicios: internos vs externos
    const internalServices: string[] = [];
    const externalServices: Array<{
      service: string;
      description?: string;
    }> = [];

    for (const service of validatedData.services) {
      const classification = await checkIfServiceIsExternal({
        service_description: service.service_type,
      });

      if (classification.is_external) {
        externalServices.push({
          service: service.service_type,
          description: service.description,
        });
      } else {
        internalServices.push(service.service_type);
      }
    }

    console.log('[create-quotation-request] Services classified:', {
      internal: internalServices,
      external: externalServices.map(s => s.service),
    });

    // 6. Guardar clasificación de servicios en el quotation_request
    await supabaseAdmin
      .from('quotation_requests')
      .update({
        internal_services: internalServices.map(s => ({
          service: s,
          feasible: true,
        })),
        external_services: externalServices.map(s => ({
          service: s.service,
          material: validatedData.material_requested,
          quantity: validatedData.quantity,
        })),
      })
      .eq('id', quotationRequest.id);

    // 7. Para cada servicio externo: buscar proveedores y enviar RFQs
    const externalServicesResults = [];

    for (const externalService of externalServices) {
      try {
        console.log('[create-quotation-request] Searching providers for:', externalService.service);

        // 7a. Buscar proveedores (primero en DB, luego Google)
        const providers = await findProviders({
          service: externalService.service,
          material: validatedData.material_requested,
          location: 'España', // TODO: Extraer de configuración
          radius: 100, // km
        });

        const allProviders = [
          ...providers.fromDatabase,
          ...providers.fromGoogle,
        ];

        console.log('[create-quotation-request] Providers found:', {
          service: externalService.service,
          total: allProviders.length,
          fromDB: providers.fromDatabase.length,
          fromGoogle: providers.fromGoogle.length,
        });

        // 7b. Enviar RFQ a cada proveedor (máximo 5 para no saturar)
        const providersToContact = allProviders.slice(0, 5);
        let rfqsSent = 0;

        for (const provider of providersToContact) {
          try {
            // Generar email personalizado
            const emailContent = await generateProviderEmail({
              provider_name: provider.name || provider.provider_name,
              service_requested: externalService.service,
              material: validatedData.material_requested,
              quantity: validatedData.quantity,
              technical_specs: validatedData.tolerances || validatedData.surface_finish,
              deadline: validatedData.delivery_deadline,
              customer_company: validatedData.customer_company,
            });

            // Verificar que tengamos email del proveedor
            const providerEmail = provider.email || provider.contact_email;
            if (!providerEmail) {
              console.warn('[create-quotation-request] Provider without email:', provider.name);
              continue;
            }

            // Crear external_quotation en BD
            const { data: externalQuotation, error: extQuoteError } = await supabaseAdmin
              .from('external_quotations')
              .insert({
                quotation_request_id: quotationRequest.id,
                provider_name: provider.name || provider.provider_name,
                provider_email: providerEmail,
                provider_phone: provider.phone || provider.contact_phone,
                provider_source: provider.google_place_id ? 'google_places' : 'knowledge_base',
                service_type: externalService.service,
                service_details: {
                  material: validatedData.material_requested,
                  quantity: validatedData.quantity,
                  description: externalService.description,
                  tolerances: validatedData.tolerances,
                  surface_finish: validatedData.surface_finish,
                },
                status: 'pending',
              })
              .select()
              .single();

            if (extQuoteError) {
              console.error('[create-quotation-request] Error creating external_quotation:', extQuoteError);
              continue;
            }

            // Enviar email al proveedor
            try {
              await sendEmail({
                to: providerEmail,
                subject: emailContent.subject,
                body: emailContent.body,
                bodyHtml: emailContent.body.replace(/\n/g, '<br>'),
              });

              // Actualizar estado a 'sent'
              await supabaseAdmin
                .from('external_quotations')
                .update({
                  status: 'sent',
                  email_sent_at: new Date().toISOString(),
                })
                .eq('id', externalQuotation.id);

              rfqsSent++;
              console.log('[create-quotation-request] RFQ sent to:', providerEmail);
            } catch (emailError: any) {
              console.error('[create-quotation-request] Error sending email:', emailError.message);
              // Mantener status 'pending' para reintentar después
            }
          } catch (providerError: any) {
            console.error('[create-quotation-request] Error processing provider:', providerError.message);
          }
        }

        externalServicesResults.push({
          service: externalService.service,
          providers_found: allProviders.length,
          rfqs_sent: rfqsSent,
        });

      } catch (serviceError: any) {
        console.error('[create-quotation-request] Error processing service:', serviceError.message);
        externalServicesResults.push({
          service: externalService.service,
          providers_found: 0,
          rfqs_sent: 0,
        });
      }
    }

    // 8. Actualizar estado del quotation_request
    const newStatus = externalServices.length > 0 ? 'waiting_providers' : 'ready_for_human';
    await supabaseAdmin
      .from('quotation_requests')
      .update({ status: newStatus })
      .eq('id', quotationRequest.id);

    // 9. Generar mensaje para el cliente
    const totalRFQsSent = externalServicesResults.reduce((sum, s) => sum + s.rfqs_sent, 0);
    const hasExternalServices = externalServices.length > 0;

    let customerMessage = '';
    if (hasExternalServices && totalRFQsSent > 0) {
      customerMessage = `¡Perfecto! He enviado tu solicitud a ${totalRFQsSent} proveedor${totalRFQsSent > 1 ? 'es' : ''} especializado${totalRFQsSent > 1 ? 's' : ''} en ${externalServices.map(s => s.service).join(' y ')}. Normalmente recibimos respuestas en 2-3 días laborables. Te mantendré informado cuando tengamos cotizaciones.`;
    } else if (hasExternalServices && totalRFQsSent === 0) {
      customerMessage = `He recibido tu solicitud. Estamos buscando proveedores especializados para los servicios externos requeridos. Te contactaré en breve con más información.`;
    } else {
      customerMessage = `¡Excelente! Todos los servicios que necesitas los realizamos internamente en Arkcutt. Un miembro de nuestro equipo de ingeniería revisará tu solicitud y te enviará una cotización detallada en las próximas 24 horas.`;
    }

    const responseTime = Date.now() - startTime;

    // 10. Respuesta a Fin
    const response: CreateQuotationFromFinResponse = {
      success: true,
      quotation_request_id: quotationRequest.id,
      status: 'searching_providers',
      message: 'Quotation request created and provider search initiated',
      services_breakdown: {
        internal_services: internalServices,
        external_services: externalServicesResults,
      },
      customer_message: customerMessage,
      estimated_response_time: hasExternalServices ? '2-3 días laborables' : '24 horas',
    };

    console.log('[create-quotation-request] Success:', {
      quotation_id: quotationRequest.id,
      rfqs_sent: totalRFQsSent,
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
