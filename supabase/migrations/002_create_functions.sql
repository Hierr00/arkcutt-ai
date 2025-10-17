-- 💾 MIGRACIÓN 002: Crear funciones y triggers

-- Función para actualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para solicitudes_presupuesto
CREATE TRIGGER update_solicitudes_presupuesto_updated_at
  BEFORE UPDATE ON solicitudes_presupuesto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_memory
CREATE TRIGGER update_user_memory_last_updated
  BEFORE UPDATE ON user_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para búsqueda de vectores similares
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_user_id text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.user_id,
    embeddings.content,
    1 - (embeddings.embedding <=> query_embedding) as similarity,
    embeddings.metadata
  FROM embeddings
  WHERE
    (filter_user_id IS NULL OR embeddings.user_id = filter_user_id)
    AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Función para obtener métricas de agente
CREATE OR REPLACE FUNCTION get_agent_performance(
  agent_name_param TEXT,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  agent TEXT,
  total_requests BIGINT,
  avg_response_time FLOAT,
  avg_confidence FLOAT,
  total_tokens BIGINT,
  date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    agent_metrics.agent_name,
    COUNT(*) as total_requests,
    AVG(agent_metrics.response_time_ms) as avg_response_time,
    AVG(agent_metrics.confidence) as avg_confidence,
    SUM(agent_metrics.tokens_used) as total_tokens,
    DATE_TRUNC('day', agent_metrics.created_at)::DATE as date
  FROM agent_metrics
  WHERE
    agent_metrics.agent_name = agent_name_param
    AND agent_metrics.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY agent_metrics.agent_name, DATE_TRUNC('day', agent_metrics.created_at)
  ORDER BY date DESC;
END;
$$;

-- Función para obtener resumen de usuario
CREATE OR REPLACE FUNCTION get_user_summary(user_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_id', user_id_param,
    'total_conversations', (
      SELECT COUNT(*) FROM conversaciones WHERE user_id = user_id_param
    ),
    'total_requests', (
      SELECT COUNT(*) FROM solicitudes_presupuesto WHERE user_id = user_id_param
    ),
    'preferred_materials', (
      SELECT materiales_preferidos FROM user_memory WHERE user_id = user_id_param
    ),
    'last_interaction', (
      SELECT MAX(created_at) FROM conversaciones WHERE user_id = user_id_param
    ),
    'company', (
      SELECT empresa FROM user_memory WHERE user_id = user_id_param
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION match_embeddings IS 'Búsqueda semántica de embeddings similares';
COMMENT ON FUNCTION get_agent_performance IS 'Métricas de performance de un agente';
COMMENT ON FUNCTION get_user_summary IS 'Resumen completo de actividad de un usuario';
