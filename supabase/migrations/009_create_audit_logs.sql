/**
 * Migration 009: Audit Logs System
 * Sistema completo de auditoría para tracking de operaciones críticas
 */

-- Tabla de audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identificación del evento
  event_type TEXT NOT NULL, -- ej: 'quotation_created', 'email_sent', 'rfq_created'
  event_category TEXT NOT NULL, -- ej: 'quotation', 'email', 'rfq', 'provider', 'user'

  -- Actor (quién realizó la acción)
  actor_type TEXT, -- 'user', 'system', 'agent', 'cron'
  actor_id TEXT, -- ID del usuario o nombre del proceso

  -- Recurso afectado
  resource_type TEXT NOT NULL, -- ej: 'quotation_request', 'email', 'rfq'
  resource_id TEXT NOT NULL, -- ID del recurso

  -- Detalles del evento
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'sent', 'received'
  status TEXT, -- 'success', 'failed', 'pending'

  -- Contexto adicional
  metadata JSONB, -- Información adicional del evento
  changes JSONB, -- Cambios realizados (before/after)

  -- Información de request
  ip_address TEXT,
  user_agent TEXT,

  -- Error info (si aplica)
  error_message TEXT,
  error_stack TEXT
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs (event_type);
CREATE INDEX idx_audit_logs_event_category ON audit_logs (event_category);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_type, actor_id);
CREATE INDEX idx_audit_logs_status ON audit_logs (status);

-- Índice GIN para búsquedas en metadata
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- RLS policies (todos pueden leer, solo sistema puede escribir)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable by authenticated users"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo service role puede insertar
CREATE POLICY "Only service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Función para auto-limpieza de logs antiguos (opcional)
-- Mantener logs de 90 días
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- View para análisis de eventos por categoría
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT
  event_category,
  event_type,
  action,
  status,
  COUNT(*) as count,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM audit_logs
GROUP BY event_category, event_type, action, status;

-- View para errores recientes
CREATE OR REPLACE VIEW recent_errors AS
SELECT
  id,
  created_at,
  event_type,
  resource_type,
  resource_id,
  error_message,
  metadata
FROM audit_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

COMMENT ON TABLE audit_logs IS 'Registro de auditoría de todas las operaciones críticas del sistema';
COMMENT ON COLUMN audit_logs.event_type IS 'Tipo específico de evento (ej: quotation_created, email_sent)';
COMMENT ON COLUMN audit_logs.event_category IS 'Categoría general del evento (quotation, email, rfq, etc)';
COMMENT ON COLUMN audit_logs.metadata IS 'Información adicional en formato JSON';
COMMENT ON COLUMN audit_logs.changes IS 'Cambios realizados en formato {before: {...}, after: {...}}';
