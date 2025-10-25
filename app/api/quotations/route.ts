/**
 * 📊 API: Quotation Requests
 * Endpoint para obtener solicitudes de presupuesto
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status');

    // Obtener quotation requests
    let query = supabase
      .from('quotation_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Filtrar por status específico si se proporciona
    if (status) {
      if (status === 'active') {
        // Todos los estados activos
        query = query.in('status', ['gathering_info', 'waiting_providers', 'ready_for_human']);
      } else if (status === 'rejected_all') {
        // Rejected y spam juntos
        query = query.in('status', ['rejected', 'spam']);
      } else {
        // Status específico
        query = query.eq('status', status);
      }
    }
    // Filtrar según tipo legacy (para compatibilidad)
    else if (type === 'handled') {
      // Solo pedidos reales (no escalados por spam/marketing)
      query = query.gte('agent_analysis->confidence', 0.70);
    } else if (type === 'escalated') {
      // Solo emails escalados (baja confianza o spam)
      query = query.lt('agent_analysis->confidence', 0.70);
    }
    // Si type === 'all', no filtramos

    const { data, error } = await query;

    if (error) throw error;

    // Mapear para incluir datos de la vista
    const quotations = data?.map((q: any) => ({
      id: q.id,
      external_id: q.external_id,
      status: q.status,
      customer_email: q.customer_email,
      customer_name: q.customer_name,
      customer_company: q.customer_company,
      parts_description: q.parts_description,
      quantity: q.quantity,
      material_requested: q.material_requested,
      missing_info: q.missing_info,
      created_at: q.created_at,
      updated_at: q.updated_at,
      agent_analysis: q.agent_analysis,
    })) || [];

    return NextResponse.json({
      success: true,
      quotations,
      total: quotations.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching quotations:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        quotations: [],
      },
      { status: 500 }
    );
  }
}

// GET individual quotation
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID required' },
        { status: 400 }
      );
    }

    // Obtener quotation request completo
    const { data: quotation, error: qError } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (qError) throw qError;

    // Obtener cotizaciones externas
    const { data: externalQuotes, error: eqError } = await supabase
      .from('external_quotations')
      .select('*')
      .eq('quotation_request_id', id);

    if (eqError) throw eqError;

    // Obtener interacciones
    const { data: interactions, error: iError } = await supabase
      .from('quotation_interactions')
      .select('*')
      .eq('quotation_request_id', id)
      .order('created_at', { ascending: false });

    if (iError) throw iError;

    return NextResponse.json({
      success: true,
      quotation,
      externalQuotes: externalQuotes || [],
      interactions: interactions || [],
    });
  } catch (error: any) {
    console.error('❌ Error fetching quotation details:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
