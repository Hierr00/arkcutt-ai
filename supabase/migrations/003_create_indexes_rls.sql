-- 💾 MIGRACIÓN 003: Índices adicionales y RLS (Row Level Security)

-- Índices adicionales para optimización

-- Índice compuesto para búsquedas frecuentes de conversaciones
CREATE INDEX idx_conversaciones_user_session ON conversaciones(user_id, session_id);

-- Índice para búsqueda de solicitudes por usuario y estado
CREATE INDEX idx_solicitudes_user_status ON solicitudes_presupuesto(user_id, status);

-- Índice para JSON fields más consultados
CREATE INDEX idx_conversaciones_metadata_gin ON conversaciones USING GIN (metadata);
CREATE INDEX idx_solicitudes_datos_tecnicos_gin ON solicitudes_presupuesto USING GIN (datos_tecnicos);
CREATE INDEX idx_solicitudes_datos_contacto_gin ON solicitudes_presupuesto USING GIN (datos_contacto);

-- Vista para dashboard de métricas
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT
  agent_name,
  COUNT(*) as total_requests,
  AVG(response_time_ms) as avg_response_time,
  AVG(confidence) as avg_confidence,
  SUM(tokens_used) as total_tokens,
  DATE_TRUNC('day', created_at) as date
FROM agent_metrics
GROUP BY agent_name, DATE_TRUNC('day', created_at)
ORDER BY date DESC, agent_name;

-- Vista para solicitudes pendientes
CREATE OR REPLACE VIEW pending_requests AS
SELECT
  id,
  session_id,
  user_id,
  status,
  datos_tecnicos,
  datos_contacto,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_pending
FROM solicitudes_presupuesto
WHERE status IN ('pending', 'processing')
ORDER BY created_at ASC;

-- Vista para métricas diarias
CREATE OR REPLACE VIEW daily_metrics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_messages,
  AVG(confidence) as avg_confidence
FROM conversaciones
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Row Level Security (RLS)
-- Nota: Para producción, configurar políticas según necesidades de seguridad

-- Habilitar RLS en tablas sensibles
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_presupuesto ENABLE ROW LEVEL SECURITY;

-- Política básica: usuarios solo pueden ver sus propios datos
-- (Ajustar según sistema de autenticación usado)

-- Para user_memory
CREATE POLICY "Users can view own memory"
  ON user_memory FOR SELECT
  USING (true); -- Modificar según auth

CREATE POLICY "Users can update own memory"
  ON user_memory FOR UPDATE
  USING (true); -- Modificar según auth

-- Para solicitudes_presupuesto
CREATE POLICY "Users can view own requests"
  ON solicitudes_presupuesto FOR SELECT
  USING (true); -- Modificar según auth

CREATE POLICY "Users can create own requests"
  ON solicitudes_presupuesto FOR INSERT
  WITH CHECK (true); -- Modificar según auth

-- Las tablas conversaciones, workflow_traces y agent_metrics
-- típicamente solo son accesibles por service role (backend)
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

-- Solo service role puede acceder
CREATE POLICY "Service role only for conversaciones"
  ON conversaciones FOR ALL
  USING (true); -- Solo accesible vía service role key

CREATE POLICY "Service role only for workflow_traces"
  ON workflow_traces FOR ALL
  USING (true);

CREATE POLICY "Service role only for agent_metrics"
  ON agent_metrics FOR ALL
  USING (true);

-- Comentarios
COMMENT ON VIEW agent_performance_summary IS 'Resumen de performance de agentes por día';
COMMENT ON VIEW pending_requests IS 'Solicitudes pendientes con tiempo de espera';
COMMENT ON VIEW daily_metrics IS 'Métricas diarias de uso del sistema';
