/**
 * ⚙️ API: Company Settings
 * Gestión de configuración de servicios y capacidades
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings
 * Obtiene la configuración actual
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // Obtener una configuración específica
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('setting_key', key)
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, setting: data });
    }

    // Obtener todas las configuraciones
    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('*')
      .order('setting_key');

    if (error) throw error;

    // Formatear para el frontend
    const formattedSettings: any = {};
    settings.forEach((setting) => {
      formattedSettings[setting.setting_key] = setting.setting_value;
    });

    return NextResponse.json({
      success: true,
      settings: formattedSettings,
      raw: settings,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Actualiza la configuración
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settingKey, settingValue } = body;

    if (!settingKey || !settingValue) {
      return NextResponse.json(
        { success: false, error: 'settingKey and settingValue are required' },
        { status: 400 }
      );
    }

    // Actualizar o insertar configuración
    const { data, error } = await supabase
      .from('company_settings')
      .upsert(
        {
          setting_key: settingKey,
          setting_value: settingValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'setting_key' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, setting: data });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
