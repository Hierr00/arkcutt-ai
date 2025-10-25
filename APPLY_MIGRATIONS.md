# Aplicar Migraciones en Supabase

## Estado Actual
- Parece que solo las migraciones 001-004 están aplicadas
- Necesitas aplicar 005 (crea tablas de workflow) y luego 006 (arregla constraints)

## Pasos para Aplicar

### 1. Ve al SQL Editor de Supabase
1. Abre https://supabase.com
2. Selecciona tu proyecto: **ajyadxczyhvviynlgsbe**
3. Click en **SQL Editor** en el menú izquierdo
4. Click en **New Query**

### 2. Aplica Migración 005

Copia y pega este SQL completo:

```sql
-- =============================================
-- MIGRATION 005: QUOTATION WORKFLOW SCHEMA
-- Sistema de gestión de solicitudes de presupuesto
-- =============================================

-- TABLA: quotation_requests
-- Cada email/solicitud de presupuesto entrante
CREATE TABLE IF NOT EXISTS quotation_requests (
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

  -- Información faltante
  missing_info TEXT[],

  -- Servicios necesarios
  internal_services JSONB DEFAULT '[]',
  external_services JSONB DEFAULT '[]',

  -- Tracking
  conversation_thread_id TEXT, -- Gmail thread ID
  last_interaction TIMESTAMP WITH TIME ZONE,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT,

  -- Análisis del agente
  agent_analysis JSONB,

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'gathering_info', 'waiting_providers', 'ready_for_human', 'quoted', 'rejected', 'spam')
  )
);

-- TABLA: external_quotations
CREATE TABLE IF NOT EXISTS external_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  provider_email TEXT,
  provider_phone TEXT,
  provider_source TEXT,
  service_type TEXT NOT NULL,
  service_details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_response JSONB,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_received_at TIMESTAMP WITH TIME ZONE,
  gmail_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'sent', 'received', 'expired', 'declined')
  )
);

-- TABLA: quotation_interactions
CREATE TABLE IF NOT EXISTS quotation_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  extracted_data JSONB,
  agent_intent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_type CHECK (
    type IN ('email_received', 'email_sent', 'info_request', 'info_provided', 'provider_response')
  ),
  CONSTRAINT valid_direction CHECK (
    direction IN ('inbound', 'outbound')
  )
);

-- TABLA: guardrails_log
CREATE TABLE IF NOT EXISTS guardrails_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT NOT NULL,
  email_from TEXT NOT NULL,
  email_subject TEXT,
  email_body TEXT,
  decision TEXT NOT NULL,
  confidence NUMERIC(3, 2),
  reasons JSONB NOT NULL,
  email_type TEXT,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_decision CHECK (
    decision IN ('handle', 'escalate', 'ignore')
  )
);

-- TABLA: provider_contacts
CREATE TABLE IF NOT EXISTS provider_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'España',
  google_place_id TEXT,
  services TEXT[] NOT NULL,
  materials TEXT[],
  total_quotes_requested INTEGER DEFAULT 0,
  total_quotes_received INTEGER DEFAULT 0,
  response_rate NUMERIC(3, 2),
  avg_response_time_hours NUMERIC(6, 2),
  reliability_score NUMERIC(3, 2),
  price_competitiveness TEXT,
  quality_rating NUMERIC(2, 1),
  is_active BOOLEAN DEFAULT true,
  blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_quotation_requests_status ON quotation_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_customer_email ON quotation_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_created_at ON quotation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_external_id ON quotation_requests(external_id);

CREATE INDEX IF NOT EXISTS idx_external_quotations_request_id ON external_quotations(quotation_request_id);
CREATE INDEX IF NOT EXISTS idx_external_quotations_status ON external_quotations(status);
CREATE INDEX IF NOT EXISTS idx_external_quotations_provider_name ON external_quotations(provider_name);

CREATE INDEX IF NOT EXISTS idx_quotation_interactions_request_id ON quotation_interactions(quotation_request_id);
CREATE INDEX IF NOT EXISTS idx_quotation_interactions_created_at ON quotation_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guardrails_log_created_at ON guardrails_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardrails_log_decision ON guardrails_log(decision);
CREATE INDEX IF NOT EXISTS idx_guardrails_log_email_type ON guardrails_log(email_type);

CREATE INDEX IF NOT EXISTS idx_provider_contacts_services ON provider_contacts USING GIN(services);
CREATE INDEX IF NOT EXISTS idx_provider_contacts_is_active ON provider_contacts(is_active) WHERE is_active = true;

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quotation_requests_updated_at ON quotation_requests;
CREATE TRIGGER update_quotation_requests_updated_at
  BEFORE UPDATE ON quotation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_external_quotations_updated_at ON external_quotations;
CREATE TRIGGER update_external_quotations_updated_at
  BEFORE UPDATE ON external_quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_contacts_updated_at ON provider_contacts;
CREATE TRIGGER update_provider_contacts_updated_at
  BEFORE UPDATE ON provider_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- VIEW: quotation_summary
DROP VIEW IF EXISTS quotation_summary;

CREATE VIEW quotation_summary AS
SELECT
  qr.id,
  qr.external_id,
  qr.status,
  qr.customer_email,
  qr.customer_name,
  qr.customer_company,
  qr.parts_description,
  qr.quantity,
  qr.material_requested,
  qr.delivery_deadline,
  qr.missing_info,
  qr.created_at,
  qr.updated_at,

  COALESCE(
    (SELECT COUNT(*) FROM external_quotations eq
     WHERE eq.quotation_request_id = qr.id),
    0
  ) as total_external_services,

  COALESCE(
    (SELECT COUNT(*) FROM external_quotations eq
     WHERE eq.quotation_request_id = qr.id
     AND eq.status IN ('pending', 'sent')),
    0
  ) as pending_external_quotes,

  COALESCE(
    (SELECT COUNT(*) FROM external_quotations eq
     WHERE eq.quotation_request_id = qr.id
     AND eq.status = 'received'),
    0
  ) as received_external_quotes,

  (SELECT MAX(created_at) FROM quotation_interactions qi
   WHERE qi.quotation_request_id = qr.id) as last_interaction_at

FROM quotation_requests qr;
```

Click **RUN** (Ctrl+Enter)

### 3. Aplica Migración 006

Luego copia y pega este SQL:

```sql
-- Eliminar el constraint antiguo
ALTER TABLE quotation_interactions
DROP CONSTRAINT IF EXISTS valid_type;

-- Agregar constraint actualizado con todos los tipos
ALTER TABLE quotation_interactions
ADD CONSTRAINT valid_type CHECK (
  type IN (
    'email_received',
    'email_sent',
    'confirmation_sent',
    'info_request',
    'info_provided',
    'provider_contacted',
    'provider_response',
    'quote_received',
    'agent_note'
  )
);
```

Click **RUN** (Ctrl+Enter)

### 4. Verifica

Ejecuta este query para verificar que todo está bien:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'quotation_requests',
  'external_quotations',
  'quotation_interactions',
  'guardrails_log',
  'provider_contacts'
);
```

Deberías ver las 5 tablas listadas.

## Después de las Migraciones

Una vez aplicadas, ejecuta en tu terminal:

```bash
node scripts/clean-test-emails.js
node scripts/mark-unread.js
curl -X POST "http://localhost:3001/api/cron/process-emails" -H "Authorization: Bearer arkcutt-dev-secret-2025"
node scripts/check-workflow.js
```

¡Ahora verás el workflow completo funcionando con todas las interacciones guardadas!
