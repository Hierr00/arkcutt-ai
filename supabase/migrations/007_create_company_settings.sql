-- =============================================
-- MIGRATION 007: COMPANY SETTINGS
-- Configuración de capacidades y servicios de la empresa
-- =============================================

-- TABLA: company_settings
-- Configuración general de qué servicios puede hacer Arkcutt
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación (por si en el futuro hay multi-tenant)
  setting_key TEXT UNIQUE NOT NULL,

  -- Valor de la configuración (JSON flexible)
  setting_value JSONB NOT NULL,

  -- Descripción legible
  description TEXT,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRIGGER para updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- DATOS INICIALES: Configuración por defecto de Arkcutt
INSERT INTO company_settings (setting_key, setting_value, description) VALUES
(
  'internal_services',
  '{
    "services": [
      {
        "name": "Mecanizado CNC",
        "key": "cnc_machining",
        "description": "Mecanizado de precisión en aluminio, acero y plásticos",
        "materials": ["aluminio", "acero", "plasticos"],
        "enabled": true
      },
      {
        "name": "Corte Láser",
        "key": "laser_cutting",
        "description": "Corte láser de chapa hasta 10mm",
        "materials": ["acero", "aluminio", "acero_inoxidable"],
        "enabled": true
      },
      {
        "name": "Torneado",
        "key": "turning",
        "description": "Torneado de piezas cilíndricas",
        "materials": ["aluminio", "acero", "plasticos"],
        "enabled": true
      },
      {
        "name": "Fresado",
        "key": "milling",
        "description": "Fresado de precisión 3, 4 y 5 ejes",
        "materials": ["aluminio", "acero", "plasticos"],
        "enabled": true
      }
    ]
  }'::jsonb,
  'Servicios que Arkcutt puede realizar internamente'
),
(
  'external_services',
  '{
    "services": [
      {
        "name": "Anodizado",
        "key": "anodizing",
        "description": "Anodizado de aluminio (colores disponibles)",
        "materials": ["aluminio"],
        "reason": "Proceso químico especializado"
      },
      {
        "name": "Cromado",
        "key": "chrome_plating",
        "description": "Cromado decorativo y duro",
        "materials": ["acero", "aluminio"],
        "reason": "Proceso galvánico especializado"
      },
      {
        "name": "Galvanizado",
        "key": "galvanizing",
        "description": "Galvanizado en caliente o electrolítico",
        "materials": ["acero"],
        "reason": "Proceso químico especializado"
      },
      {
        "name": "Tratamiento Térmico",
        "key": "heat_treatment",
        "description": "Temple, revenido, normalizado",
        "materials": ["acero", "titanio"],
        "reason": "Requiere hornos especializados"
      },
      {
        "name": "Pintura Industrial",
        "key": "industrial_painting",
        "description": "Pintura en polvo o líquida",
        "materials": ["todos"],
        "reason": "Cabina de pintura especializada"
      },
      {
        "name": "Soldadura Especializada",
        "key": "specialized_welding",
        "description": "TIG, MIG, soldadura orbital",
        "materials": ["titanio", "inconel", "aluminio_aeroespacial"],
        "reason": "Certificaciones específicas requeridas"
      },
      {
        "name": "Materiales Especiales",
        "key": "special_materials",
        "description": "Titanio, Inconel, materiales aeroespaciales",
        "materials": ["titanio", "inconel", "hastelloy"],
        "reason": "No disponemos de estos materiales en stock"
      }
    ]
  }'::jsonb,
  'Servicios que requieren proveedores externos'
),
(
  'company_info',
  '{
    "name": "Arkcutt",
    "description": "Mecanizado CNC de Precisión",
    "email": "info@arkcutt.com",
    "phone": "+34 XXX XXX XXX",
    "location": "Madrid, España",
    "capabilities": {
      "max_part_size_mm": 500,
      "min_tolerance_mm": 0.01,
      "typical_lead_time_days": 7
    }
  }'::jsonb,
  'Información general de la empresa'
);

-- ÍNDICES
CREATE INDEX idx_company_settings_key ON company_settings(setting_key);

-- COMENTARIOS
COMMENT ON TABLE company_settings IS 'Configuración de servicios y capacidades de la empresa';
COMMENT ON COLUMN company_settings.setting_key IS 'Clave única de configuración (ej: internal_services, external_services)';
COMMENT ON COLUMN company_settings.setting_value IS 'Valor JSON flexible para la configuración';
