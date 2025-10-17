/**
 * 💾 TIPOS PARA BASE DE DATOS (SUPABASE)
 */

export interface Conversacion {
  id: string;
  session_id: string;
  user_id: string;
  user_message: string;
  agent_response: string;
  agent_used: string;
  intent: string;
  confidence: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  email?: string;
  nombre?: string;
  empresa?: string;
  materiales_preferidos: string[];
  tolerancias_habituales?: string;
  plazo_promedio?: number;
  total_solicitudes: number;
  industria?: string;
  last_updated: string;
  created_at: string;
}

export interface SolicitudPresupuesto {
  id: string;
  session_id: string;
  user_id: string;
  status: 'incomplete' | 'pending' | 'processing' | 'completed';
  datos_tecnicos: {
    material?: string;
    cantidad?: number;
    tolerancia?: string;
    plazo_semanas?: number;
    tratamientos?: string[];
    observaciones?: string;
  };
  datos_contacto: {
    nombre?: string;
    empresa?: string;
    email?: string;
    telefono?: string;
  };
  archivos?: {
    filename: string;
    url: string;
    type: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowTrace {
  id: string;
  workflow_id: string;
  session_id: string;
  user_id?: string;
  status: 'running' | 'completed' | 'failed';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: Record<string, any>;
  duration_ms?: number;
  created_at: string;
  completed_at?: string;
}

export interface AgentMetric {
  id: string;
  agent_name: string;
  session_id: string;
  intent: string;
  confidence: number;
  response_time_ms: number;
  tokens_used?: number;
  created_at: string;
}
