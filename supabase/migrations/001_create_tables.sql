-- 💾 MIGRACIÓN 001: Crear tablas principales
-- Sistema de presupuestos industriales con Mastra AI

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Tabla de conversaciones (auditoría completa)
CREATE TABLE conversaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  agent_used TEXT NOT NULL,
  intent TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para conversaciones
CREATE INDEX idx_conversaciones_session ON conversaciones(session_id);
CREATE INDEX idx_conversaciones_user ON conversaciones(user_id);
CREATE INDEX idx_conversaciones_created ON conversaciones(created_at DESC);
CREATE INDEX idx_conversaciones_intent ON conversaciones(intent);

-- Tabla de memoria de usuario
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  nombre TEXT,
  empresa TEXT,
  materiales_preferidos TEXT[] DEFAULT '{}',
  tolerancias_habituales TEXT,
  plazo_promedio INTEGER,
  total_solicitudes INTEGER DEFAULT 0,
  industria TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_memory
CREATE INDEX idx_user_memory_user ON user_memory(user_id);
CREATE INDEX idx_user_memory_email ON user_memory(email);

-- Tabla de solicitudes de presupuesto
CREATE TABLE solicitudes_presupuesto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('incomplete', 'pending', 'processing', 'completed')),
  datos_tecnicos JSONB NOT NULL DEFAULT '{}'::jsonb,
  datos_contacto JSONB NOT NULL DEFAULT '{}'::jsonb,
  archivos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para solicitudes
CREATE INDEX idx_solicitudes_session ON solicitudes_presupuesto(session_id);
CREATE INDEX idx_solicitudes_user ON solicitudes_presupuesto(user_id);
CREATE INDEX idx_solicitudes_status ON solicitudes_presupuesto(status);
CREATE INDEX idx_solicitudes_created ON solicitudes_presupuesto(created_at DESC);

-- Tabla para embeddings (vector store)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda vectorial
CREATE INDEX idx_embeddings_user ON embeddings(user_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Tabla para traces de workflows (observabilidad)
CREATE TABLE workflow_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  input JSONB NOT NULL,
  output JSONB,
  error JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para workflow_traces
CREATE INDEX idx_workflow_traces_session ON workflow_traces(session_id);
CREATE INDEX idx_workflow_traces_workflow ON workflow_traces(workflow_id);
CREATE INDEX idx_workflow_traces_status ON workflow_traces(status);
CREATE INDEX idx_workflow_traces_created ON workflow_traces(created_at DESC);

-- Tabla para métricas de agentes
CREATE TABLE agent_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  response_time_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para agent_metrics
CREATE INDEX idx_agent_metrics_agent ON agent_metrics(agent_name);
CREATE INDEX idx_agent_metrics_session ON agent_metrics(session_id);
CREATE INDEX idx_agent_metrics_created ON agent_metrics(created_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE conversaciones IS 'Historial completo de conversaciones para auditoría';
COMMENT ON TABLE user_memory IS 'Perfil y preferencias de cada usuario';
COMMENT ON TABLE solicitudes_presupuesto IS 'Solicitudes de presupuesto con datos técnicos';
COMMENT ON TABLE embeddings IS 'Vector store para búsqueda semántica';
COMMENT ON TABLE workflow_traces IS 'Trazas de ejecución de workflows (observabilidad)';
COMMENT ON TABLE agent_metrics IS 'Métricas de performance de agentes';
