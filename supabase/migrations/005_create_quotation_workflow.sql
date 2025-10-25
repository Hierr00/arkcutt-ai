-- =============================================
-- MIGRATION 005: QUOTATION WORKFLOW SCHEMA
-- Sistema de gestión de solicitudes de presupuesto
-- =============================================

-- TABLA: quotation_requests
-- Cada email/solicitud de presupuesto entrante
CREATE TABLE quotation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  external_id TEXT UNIQUE, -- email_id de Gmail
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | gathering_info | waiting_providers | ready_for_human | quoted | rejected

  -- Cliente
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_company TEXT,

  -- Información del pedido (extraída por el agente)
  parts_description TEXT,
  quantity INTEGER,
  material_requested TEXT,
  tolerances TEXT,
  surface_finish TEXT,
  delivery_deadline DATE,

  -- Archivos adjuntos
  attachments JSONB DEFAULT '[]',
  -- [{ "filename": "plano.pdf", "url": "...", "type": "drawing" }]

  -- Información faltante
  missing_info TEXT[],
  -- ["material_especifico", "cantidad", "tolerancias"]

  -- Servicios necesarios
  internal_services JSONB DEFAULT '[]',
  -- [{ "service": "mecanizado_cnc", "feasible": true, "estimated_days": 5 }]

  external_services JSONB DEFAULT '[]',
  -- [{ "service": "anodizado", "material": "aluminio", "quantity": 100 }]

  -- Tracking
  conversation_thread_id TEXT, -- Gmail thread ID
  last_interaction TIMESTAMP WITH TIME ZONE,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT, -- Usuario humano asignado

  -- Análisis del agente
  agent_analysis JSONB,
  -- { "complexity": "medium", "confidence": 0.85, "flags": ["material_no_disponible"] }

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'gathering_info', 'waiting_providers', 'ready_for_human', 'quoted', 'rejected', 'spam')
  )
);

-- TABLA: external_quotations
-- Cotizaciones solicitadas a proveedores externos
CREATE TABLE external_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación con solicitud
  quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,

  -- Proveedor
  provider_name TEXT NOT NULL,
  provider_email TEXT,
  provider_phone TEXT,
  provider_source TEXT, -- 'knowledge_base' | 'google_places' | 'manual'

  -- Servicio solicitado
  service_type TEXT NOT NULL, -- 'anodizado' | 'tratamiento_termico' | 'material'
  service_details JSONB NOT NULL,
  -- { "material": "aluminio_7075", "quantity": 100, "finish": "anodizado_negro" }

  -- Estado de la cotización
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | sent | received | expired | declined

  -- Respuesta del proveedor
  provider_response JSONB,
  -- { "price": 450, "currency": "EUR", "lead_time_days": 5, "notes": "..." }

  -- Comunicación
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_received_at TIMESTAMP WITH TIME ZONE,
  gmail_message_id TEXT, -- ID del email enviado

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Cotización válida hasta

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'sent', 'received', 'expired', 'declined')
  )
);

-- TABLA: quotation_interactions
-- Historial de interacciones con clientes (emails, respuestas)
CREATE TABLE quotation_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,

  -- Tipo de interacción
  type TEXT NOT NULL, -- 'email_received' | 'email_sent' | 'info_request' | 'info_provided'
  direction TEXT NOT NULL, -- 'inbound' | 'outbound'

  -- Contenido
  subject TEXT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',

  -- Identificación
  gmail_message_id TEXT,
  gmail_thread_id TEXT,

  -- Análisis del agente
  extracted_data JSONB,
  -- Info extraída automáticamente: { "material": "aluminio", "quantity": 100 }

  agent_intent TEXT,
  -- 'request_missing_info' | 'confirm_details' | 'notify_human'

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (
    type IN ('email_received', 'email_sent', 'info_request', 'info_provided', 'provider_response')
  ),
  CONSTRAINT valid_direction CHECK (
    direction IN ('inbound', 'outbound')
  )
);

-- TABLA: guardrails_log
-- Registro de decisiones de guardrails (qué emails responder, cuáles escalar)
CREATE TABLE guardrails_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email analizado
  email_id TEXT NOT NULL,
  email_from TEXT NOT NULL,
  email_subject TEXT,
  email_body TEXT,

  -- Decisión del guardrail
  decision TEXT NOT NULL, -- 'handle' | 'escalate' | 'ignore'
  confidence NUMERIC(3, 2), -- 0.0 - 1.0

  -- Razones
  reasons JSONB NOT NULL,
  -- [
  --   { "rule": "is_quotation_request", "passed": true, "confidence": 0.95 },
  --   { "rule": "has_attachments", "passed": true },
  --   { "rule": "not_spam", "passed": true, "confidence": 0.99 }
  -- ]

  -- Clasificación
  email_type TEXT,
  -- 'quotation_request' | 'general_inquiry' | 'complaint' | 'spam' | 'out_of_scope'

  -- Acción tomada
  action_taken TEXT,
  -- 'created_quotation_request' | 'escalated_to_human' | 'ignored' | 'auto_replied'

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_decision CHECK (
    decision IN ('handle', 'escalate', 'ignore')
  )
);

-- TABLA: provider_contacts
-- Catálogo de proveedores con historial de respuestas
CREATE TABLE provider_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Información básica
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Ubicación
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'España',
  google_place_id TEXT, -- ID de Google Places

  -- Servicios
  services TEXT[] NOT NULL, -- ['anodizado', 'cromado', 'niquelado']
  materials TEXT[], -- ['aluminio', 'acero', 'titanio']

  -- Performance histórico
  total_quotes_requested INTEGER DEFAULT 0,
  total_quotes_received INTEGER DEFAULT 0,
  response_rate NUMERIC(3, 2), -- % de respuestas
  avg_response_time_hours NUMERIC(6, 2),

  -- Calidad
  reliability_score NUMERIC(3, 2), -- 0.0 - 1.0
  price_competitiveness TEXT, -- 'low' | 'medium' | 'high'
  quality_rating NUMERIC(2, 1), -- 1.0 - 5.0

  -- Estado
  is_active BOOLEAN DEFAULT true,
  blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted TIMESTAMP WITH TIME ZONE,

  -- Notas
  notes TEXT
);

-- ÍNDICES para performance
CREATE INDEX idx_quotation_requests_status ON quotation_requests(status);
CREATE INDEX idx_quotation_requests_customer_email ON quotation_requests(customer_email);
CREATE INDEX idx_quotation_requests_created_at ON quotation_requests(created_at DESC);
CREATE INDEX idx_quotation_requests_external_id ON quotation_requests(external_id);

CREATE INDEX idx_external_quotations_request_id ON external_quotations(quotation_request_id);
CREATE INDEX idx_external_quotations_status ON external_quotations(status);
CREATE INDEX idx_external_quotations_provider_name ON external_quotations(provider_name);

CREATE INDEX idx_quotation_interactions_request_id ON quotation_interactions(quotation_request_id);
CREATE INDEX idx_quotation_interactions_created_at ON quotation_interactions(created_at DESC);

CREATE INDEX idx_guardrails_log_created_at ON guardrails_log(created_at DESC);
CREATE INDEX idx_guardrails_log_decision ON guardrails_log(decision);
CREATE INDEX idx_guardrails_log_email_type ON guardrails_log(email_type);

CREATE INDEX idx_provider_contacts_services ON provider_contacts USING GIN(services);
CREATE INDEX idx_provider_contacts_is_active ON provider_contacts(is_active) WHERE is_active = true;

-- TRIGGERS para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotation_requests_updated_at
  BEFORE UPDATE ON quotation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_quotations_updated_at
  BEFORE UPDATE ON external_quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_contacts_updated_at
  BEFORE UPDATE ON provider_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- VIEW: quotation_summary
-- Vista consolidada para el dashboard del humano
CREATE VIEW quotation_summary AS
SELECT
  qr.id,
  qr.external_id,
  qr.status,
  qr.customer_email,
  qr.customer_name,
  qr.customer_company,
  qr.quantity,
  qr.material_requested,
  qr.delivery_deadline,
  qr.created_at,
  qr.updated_at,
  qr.missing_info,

  -- Contar servicios externos
  COALESCE(
    (SELECT COUNT(*) FROM external_quotations eq
     WHERE eq.quotation_request_id = qr.id),
    0
  ) as total_external_services,

  -- Contar cotizaciones pendientes
  COALESCE(
    (SELECT COUNT(*) FROM external_quotations eq
     WHERE eq.quotation_request_id = qr.id
     AND eq.status IN ('pending', 'sent')),
    0
  ) as pending_external_quotes,

  -- Contar cotizaciones recibidas
  COALESCE(
    (SELECT COUNT(*) FROM external_quotations eq
     WHERE eq.quotation_request_id = qr.id
     AND eq.status = 'received'),
    0
  ) as received_external_quotes,

  -- Última interacción
  (SELECT MAX(created_at) FROM quotation_interactions qi
   WHERE qi.quotation_request_id = qr.id) as last_interaction_at

FROM quotation_requests qr;

-- COMENTARIOS
COMMENT ON TABLE quotation_requests IS 'Solicitudes de presupuesto entrantes de clientes';
COMMENT ON TABLE external_quotations IS 'Cotizaciones solicitadas a proveedores externos';
COMMENT ON TABLE quotation_interactions IS 'Historial de comunicación con clientes';
COMMENT ON TABLE guardrails_log IS 'Registro de decisiones de seguridad del agente';
COMMENT ON TABLE provider_contacts IS 'Catálogo de proveedores con métricas de performance';
