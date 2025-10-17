/**
 * 🧠 RAG SYSTEM - Vector Database for Context Engineering
 * Migración para crear el sistema RAG con pgvector
 */

-- Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla principal de embeddings para RAG
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Clasificación
  agent_type TEXT NOT NULL CHECK (agent_type IN ('material', 'engineering', 'providers', 'general')),
  category TEXT NOT NULL, -- 'properties', 'suppliers', 'notes', 'capabilities', etc.
  subcategory TEXT,

  -- Contenido
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small

  -- Metadata estructurada
  metadata JSONB DEFAULT '{}',

  -- Búsqueda de texto completo
  content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED,

  -- Relevancia y calidad
  importance_score FLOAT DEFAULT 1.0, -- 0.0 - 1.0, para priorizar resultados
  verified BOOLEAN DEFAULT false, -- Si ha sido verificado por humano

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  version INTEGER DEFAULT 1
);

-- Índices para búsqueda rápida
CREATE INDEX idx_knowledge_agent_type ON knowledge_embeddings(agent_type);
CREATE INDEX idx_knowledge_category ON knowledge_embeddings(agent_type, category);
CREATE INDEX idx_knowledge_tsv ON knowledge_embeddings USING GIN(content_tsv);
CREATE INDEX idx_knowledge_importance ON knowledge_embeddings(importance_score DESC);

-- Índice de vector similarity (HNSW es más rápido que IVFFlat)
CREATE INDEX idx_knowledge_embedding_hnsw ON knowledge_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_knowledge_updated_at
  BEFORE UPDATE ON knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

-- Tabla de proveedores (información estructurada)
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Información básica
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'material_supplier', 'treatment', 'certification', 'machining', etc.

  -- Contacto
  email TEXT,
  phone TEXT,
  website TEXT,
  contact_person TEXT,

  -- Servicios y especialidades
  services TEXT[] DEFAULT '{}',
  materials TEXT[] DEFAULT '{}', -- Para proveedores de materiales
  specialties TEXT[] DEFAULT '{}',

  -- Información operativa
  lead_time_days INTEGER,
  min_order_value DECIMAL,
  min_order_quantity TEXT,
  location TEXT,
  coverage_zones TEXT[] DEFAULT '{}',

  -- Calificación y confianza
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
  trust_level TEXT CHECK (trust_level IN ('preferred', 'trusted', 'verified', 'new')),
  total_orders INTEGER DEFAULT 0,

  -- Notas importantes
  notes TEXT,
  special_requirements TEXT,
  payment_terms TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Estado
  active BOOLEAN DEFAULT true,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_providers_type ON providers(type);
CREATE INDEX idx_providers_services ON providers USING GIN(services);
CREATE INDEX idx_providers_materials ON providers USING GIN(materials);
CREATE INDEX idx_providers_active ON providers(active) WHERE active = true;
CREATE INDEX idx_providers_trust ON providers(trust_level);

-- Tabla de inventario de materiales
CREATE TABLE IF NOT EXISTS material_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación del material
  material_code TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_grade TEXT,

  -- Dimensiones
  dimensions TEXT, -- ej: "100x200x50mm"
  thickness DECIMAL,
  width DECIMAL,
  length DECIMAL,
  weight_kg DECIMAL,

  -- Stock
  quantity_available INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  quantity_unit TEXT DEFAULT 'units', -- 'units', 'kg', 'm2', etc.

  -- Ubicación
  warehouse_location TEXT,
  bin_location TEXT,

  -- Proveedor
  supplier_id UUID REFERENCES providers(id),
  supplier_name TEXT,

  -- Costos
  cost_per_unit DECIMAL,
  last_purchase_date TIMESTAMP WITH TIME ZONE,

  -- Límites
  reorder_point INTEGER DEFAULT 5,
  reorder_quantity INTEGER DEFAULT 10,

  -- Estado
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'low_stock', 'out_of_stock')),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_material_code ON material_inventory(material_code);
CREATE INDEX idx_material_status ON material_inventory(status);
CREATE INDEX idx_material_available ON material_inventory(quantity_available) WHERE quantity_available > 0;
CREATE INDEX idx_material_supplier ON material_inventory(supplier_id);

-- Función para búsqueda semántica de embeddings
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding VECTOR(1536),
  agent_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  agent_type TEXT,
  category TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.agent_type,
    ke.category,
    ke.content,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE
    (agent_filter IS NULL OR ke.agent_type = agent_filter)
    AND (category_filter IS NULL OR ke.category = category_filter)
    AND (1 - (ke.embedding <=> query_embedding)) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Función para búsqueda híbrida (vector + texto)
CREATE OR REPLACE FUNCTION search_knowledge_hybrid(
  query_embedding VECTOR(1536),
  query_text TEXT,
  agent_filter TEXT DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  agent_type TEXT,
  category TEXT,
  content TEXT,
  metadata JSONB,
  vector_similarity FLOAT,
  text_rank FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      ke.id,
      ke.agent_type,
      ke.category,
      ke.content,
      ke.metadata,
      1 - (ke.embedding <=> query_embedding) AS similarity
    FROM knowledge_embeddings ke
    WHERE agent_filter IS NULL OR ke.agent_type = agent_filter
    ORDER BY ke.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_search AS (
    SELECT
      ke.id,
      ts_rank(ke.content_tsv, plainto_tsquery('spanish', query_text)) AS rank
    FROM knowledge_embeddings ke
    WHERE
      (agent_filter IS NULL OR ke.agent_type = agent_filter)
      AND ke.content_tsv @@ plainto_tsquery('spanish', query_text)
  )
  SELECT
    vs.id,
    vs.agent_type,
    vs.category,
    vs.content,
    vs.metadata,
    vs.similarity AS vector_similarity,
    COALESCE(ts.rank, 0) AS text_rank,
    (vs.similarity * 0.7 + COALESCE(ts.rank, 0) * 0.3) AS combined_score
  FROM vector_search vs
  LEFT JOIN text_search ts ON vs.id = ts.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Función para buscar proveedores por servicio
CREATE OR REPLACE FUNCTION find_providers_by_service(
  service_type TEXT,
  material_filter TEXT DEFAULT NULL,
  min_rating DECIMAL DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  services TEXT[],
  rating DECIMAL,
  trust_level TEXT,
  lead_time_days INTEGER,
  notes TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.services,
    p.rating,
    p.trust_level,
    p.lead_time_days,
    p.notes
  FROM providers p
  WHERE
    p.active = true
    AND service_type = ANY(p.services)
    AND (material_filter IS NULL OR material_filter = ANY(p.materials))
    AND (p.rating IS NULL OR p.rating >= min_rating)
  ORDER BY
    CASE p.trust_level
      WHEN 'preferred' THEN 1
      WHEN 'trusted' THEN 2
      WHEN 'verified' THEN 3
      ELSE 4
    END,
    p.rating DESC NULLS LAST;
END;
$$;

-- Función para verificar stock de material
CREATE OR REPLACE FUNCTION check_material_stock(
  material_code_param TEXT,
  quantity_needed INTEGER
)
RETURNS TABLE (
  in_stock BOOLEAN,
  available INTEGER,
  location TEXT,
  supplier_name TEXT,
  needs_reorder BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (mi.quantity_available >= quantity_needed) AS in_stock,
    mi.quantity_available AS available,
    mi.warehouse_location AS location,
    mi.supplier_name,
    (mi.quantity_available <= mi.reorder_point) AS needs_reorder
  FROM material_inventory mi
  WHERE mi.material_code = material_code_param
  AND mi.status = 'available'
  ORDER BY mi.quantity_available DESC
  LIMIT 1;
END;
$$;

-- Row Level Security (RLS)
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_inventory ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (todos pueden leer, solo autenticados pueden escribir)
CREATE POLICY "Anyone can read knowledge" ON knowledge_embeddings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert knowledge" ON knowledge_embeddings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update knowledge" ON knowledge_embeddings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read providers" ON providers
  FOR SELECT USING (active = true);

CREATE POLICY "Authenticated users can manage providers" ON providers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read inventory" ON material_inventory
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage inventory" ON material_inventory
  FOR ALL USING (auth.role() = 'authenticated');

-- Comentarios para documentación
COMMENT ON TABLE knowledge_embeddings IS 'Base de conocimiento vectorial para RAG system';
COMMENT ON TABLE providers IS 'Catálogo de proveedores externos de confianza';
COMMENT ON TABLE material_inventory IS 'Inventario de materiales en stock';
COMMENT ON FUNCTION search_knowledge IS 'Búsqueda semántica pura usando embeddings';
COMMENT ON FUNCTION search_knowledge_hybrid IS 'Búsqueda híbrida combinando vector similarity y full-text search';
COMMENT ON FUNCTION find_providers_by_service IS 'Encuentra proveedores por tipo de servicio y filtros';
COMMENT ON FUNCTION check_material_stock IS 'Verifica disponibilidad de material en inventario';
