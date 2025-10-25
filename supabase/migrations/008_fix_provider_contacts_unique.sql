/**
 * Fix: Add UNIQUE constraint to google_place_id in provider_contacts
 * Necesario para que el upsert funcione correctamente
 */

-- Agregar constraint UNIQUE a google_place_id
ALTER TABLE provider_contacts
ADD CONSTRAINT provider_contacts_google_place_id_unique UNIQUE (google_place_id);

-- Crear índice para mejorar performance de búsquedas por services
CREATE INDEX IF NOT EXISTS idx_provider_contacts_services ON provider_contacts USING GIN (services);

-- Crear índice para filtrar activos
CREATE INDEX IF NOT EXISTS idx_provider_contacts_active ON provider_contacts (is_active) WHERE is_active = true;
