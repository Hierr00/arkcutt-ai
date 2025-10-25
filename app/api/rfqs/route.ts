/**
 * 📋 API: RFQs (Request for Quotations)
 * Gestión de cotizaciones a proveedores externos
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rfqs
 * Lista todas las RFQs o detalles de una específica
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const rfqId = searchParams.get('id');

    // Si se pide una RFQ específica
    if (rfqId) {
      const { data: rfq, error } = await supabase
        .from('external_quotations')
        .select(`
          *,
          quotation_requests (
            id,
            customer_email,
            customer_name,
            customer_company,
            parts_description,
            quantity,
            material_requested,
            status
          )
        `)
        .eq('id', rfqId)
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, rfq });
    }

    // Lista todas las RFQs
    let query = supabase
      .from('external_quotations')
      .select(`
        *,
        quotation_requests (
          id,
          customer_email,
          customer_name,
          parts_description,
          quantity,
          material_requested,
          status
        )
      `)
      .order('created_at', { ascending: false });

    // Filtros
    if (type === 'pending') {
      query = query.in('status', ['pending', 'sent']);
    } else if (type === 'received') {
      query = query.eq('status', 'received');
    } else if (type === 'expired') {
      query = query.eq('status', 'expired');
    }

    const { data: rfqs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, rfqs });
  } catch (error: any) {
    console.error('Error fetching RFQs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfqs
 * Actualiza el estado de una RFQ o añade respuesta de proveedor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rfqId, status, providerResponse } = body;

    if (!rfqId) {
      return NextResponse.json(
        { success: false, error: 'rfqId is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'received') {
        updateData.email_received_at = new Date().toISOString();
      }
    }

    if (providerResponse) {
      updateData.provider_response = providerResponse;
    }

    const { data, error } = await supabase
      .from('external_quotations')
      .update(updateData)
      .eq('id', rfqId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, rfq: data });
  } catch (error: any) {
    console.error('Error updating RFQ:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
