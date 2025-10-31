/**
 * 🔄 CRON JOB: Process Emails
 * Ejecuta cada 5 minutos para procesar emails nuevos
 *
 * CONFIGURACIÓN EN VERCEL:
 * - Vercel Cron Jobs (vercel.json)
 * - O usar servicio externo: cron-job.org, EasyCron
 */

import { NextRequest, NextResponse } from 'next/server';
import { quotationCoordinator } from '@/lib/agents/quotation-coordinator.agent';
import { log } from '@/mastra';

// Verificación de seguridad con API key
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');

    // Permitir Vercel Cron (user-agent: vercel-cron/1.0) o Authorization header válido
    const isVercelCron = userAgent?.includes('vercel-cron');
    const hasValidAuth = authHeader === `Bearer ${CRON_SECRET}`;

    if (!isVercelCron && !hasValidAuth) {
      log('warn', '⚠️ Intento de acceso no autorizado al cron job');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    log('info', '🔄 CRON JOB: Iniciando procesamiento de emails...');

    // Ejecutar procesamiento de emails
    const result = await quotationCoordinator.processNewEmails();

    log('info', '✅ CRON JOB: Completado', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    log('error', '❌ CRON JOB: Error', { error: error.message });

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// También permitir POST (para testing manual)
export async function POST(request: NextRequest) {
  return GET(request);
}
