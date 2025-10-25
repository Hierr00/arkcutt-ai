-- =============================================
-- MIGRATION 006: Fix Interaction Types
-- Agregar tipos de interacción faltantes
-- =============================================

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

-- Recrear vista quotation_summary para incluir parts_description
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
