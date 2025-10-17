import { createClient } from '@supabase/supabase-js';

/**
 * 💾 CLIENTE DE SUPABASE
 * Cliente único para toda la aplicación
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Cliente público (para usar en client components)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cliente con service role (para usar en server-side)
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

/**
 * Guardar conversación en Supabase
 */
export async function saveConversation(data: {
  sessionId: string;
  userId: string;
  userMessage: string;
  agentResponse: string;
  agent: string;
  intent: string;
  confidence: number;
  metadata?: Record<string, any>;
}) {
  const { error } = await supabase.from('conversaciones').insert({
    session_id: data.sessionId,
    user_id: data.userId,
    user_message: data.userMessage,
    agent_response: data.agentResponse,
    agent_used: data.agent,
    intent: data.intent,
    confidence: data.confidence,
    metadata: data.metadata,
  });

  if (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * Obtener historial de conversaciones
 */
export async function getConversationHistory(sessionId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('conversaciones')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }

  return data;
}

/**
 * Guardar/actualizar memoria de usuario
 */
export async function upsertUserMemory(
  userId: string,
  updates: Partial<{
    email: string;
    nombre: string;
    empresa: string;
    materiales_preferidos: string[];
    tolerancias_habituales: string;
    plazo_promedio: number;
    industria: string;
  }>
) {
  const { data, error } = await supabase
    .from('user_memory')
    .upsert(
      {
        user_id: userId,
        ...updates,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting user memory:', error);
    throw error;
  }

  return data;
}

/**
 * Obtener memoria de usuario
 */
export async function getUserMemory(userId: string) {
  const { data, error } = await supabase
    .from('user_memory')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching user memory:', error);
    throw error;
  }

  return data;
}

/**
 * Actualizar memoria extendida del usuario (facts, preferences, projects)
 */
export async function updateUserMemory(
  userId: string,
  memory: {
    preferences?: Record<string, any>;
    facts?: Array<{
      id: string;
      content: string;
      category: string;
      confidence: number;
      source: string;
      timestamp: Date;
      relevanceCount: number;
    }>;
    project_history?: Array<{
      id: string;
      description: string;
      materials: string[];
      services: string[];
      budget?: number;
      timestamp: Date;
    }>;
    frequent_requests?: Array<{
      pattern: string;
      frequency: number;
      lastOccurrence: Date;
    }>;
  }
) {
  const { data, error } = await supabase
    .from('user_memory')
    .upsert(
      {
        user_id: userId,
        preferences: memory.preferences,
        facts: memory.facts,
        project_history: memory.project_history,
        frequent_requests: memory.frequent_requests,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error updating user memory:', error);
    throw error;
  }

  return data;
}

/**
 * Guardar solicitud de presupuesto
 */
export async function saveBudgetRequest(data: {
  sessionId: string;
  userId: string;
  status: 'incomplete' | 'pending' | 'processing' | 'completed';
  datosTecnicos: any;
  datosContacto: any;
  archivos?: any[];
}) {
  const { data: result, error } = await supabase
    .from('solicitudes_presupuesto')
    .insert({
      session_id: data.sessionId,
      user_id: data.userId,
      status: data.status,
      datos_tecnicos: data.datosTecnicos,
      datos_contacto: data.datosContacto,
      archivos: data.archivos,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving budget request:', error);
    throw error;
  }

  return result;
}

/**
 * Actualizar solicitud de presupuesto
 */
export async function updateBudgetRequest(
  requestId: string,
  updates: {
    status?: 'incomplete' | 'pending' | 'processing' | 'completed';
    datosTecnicos?: any;
    datosContacto?: any;
    archivos?: any[];
  }
) {
  const { data, error } = await supabase
    .from('solicitudes_presupuesto')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Error updating budget request:', error);
    throw error;
  }

  return data;
}
