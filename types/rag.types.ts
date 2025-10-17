/**
 * 🧠 RAG SYSTEM TYPES
 * Tipos TypeScript para el sistema de Retrieval-Augmented Generation
 */

// ==================== Knowledge Embeddings ====================

export type AgentType = 'material' | 'engineering' | 'providers' | 'general';

export type MaterialCategory =
  | 'properties'
  | 'applications'
  | 'dimensions'
  | 'treatments'
  | 'suppliers';

export type EngineeringCategory =
  | 'capabilities'
  | 'tolerances'
  | 'processes'
  | 'limitations'
  | 'best_practices';

export type ProvidersCategory =
  | 'services'
  | 'provider_info'
  | 'provider_notes'
  | 'email_templates';

export type KnowledgeCategory =
  | MaterialCategory
  | EngineeringCategory
  | ProvidersCategory
  | 'general';

export interface KnowledgeEmbedding {
  id: string;
  agent_type: AgentType;
  category: KnowledgeCategory;
  subcategory?: string;
  content: string;
  embedding?: number[]; // Vector de 1536 dimensiones
  metadata: Record<string, any>;
  importance_score: number;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  version: number;
}

export interface CreateKnowledgeInput {
  agent_type: AgentType;
  category: KnowledgeCategory;
  subcategory?: string;
  content: string;
  metadata?: Record<string, any>;
  importance_score?: number;
  verified?: boolean;
}

export interface SearchKnowledgeParams {
  query: string;
  agent_type?: AgentType;
  category?: KnowledgeCategory;
  match_threshold?: number;
  match_count?: number;
  use_hybrid?: boolean; // Usar búsqueda híbrida (vector + texto)
}

export interface SearchResult {
  id: string;
  agent_type: AgentType;
  category: KnowledgeCategory;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  text_rank?: number; // Solo en búsqueda híbrida
  combined_score?: number; // Solo en búsqueda híbrida
}

// ==================== Providers ====================

export type ProviderType =
  | 'material_supplier'
  | 'treatment'
  | 'certification'
  | 'machining'
  | 'welding'
  | 'painting'
  | 'laser_cutting'
  | 'quality_control'
  | 'logistics';

export type TrustLevel = 'preferred' | 'trusted' | 'verified' | 'new';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;

  // Contacto
  email?: string;
  phone?: string;
  website?: string;
  contact_person?: string;

  // Servicios
  services: string[];
  materials: string[]; // Para proveedores de materiales
  specialties: string[];

  // Operativa
  lead_time_days?: number;
  min_order_value?: number;
  min_order_quantity?: string;
  location?: string;
  coverage_zones: string[];

  // Calificación
  rating?: number;
  trust_level: TrustLevel;
  total_orders: number;

  // Notas
  notes?: string;
  special_requirements?: string;
  payment_terms?: string;

  // Metadata
  metadata: Record<string, any>;
  active: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface CreateProviderInput {
  name: string;
  type: ProviderType;
  email?: string;
  phone?: string;
  website?: string;
  contact_person?: string;
  services: string[];
  materials?: string[];
  specialties?: string[];
  lead_time_days?: number;
  min_order_value?: number;
  location?: string;
  trust_level?: TrustLevel;
  notes?: string;
  special_requirements?: string;
  payment_terms?: string;
}

export interface FindProvidersParams {
  service: string;
  material?: string;
  min_rating?: number;
  location?: string;
  trust_levels?: TrustLevel[];
}

export interface ProviderSearchResult {
  id: string;
  name: string;
  email?: string;
  services: string[];
  rating?: number;
  trust_level: TrustLevel;
  lead_time_days?: number;
  notes?: string;
}

// ==================== Material Inventory ====================

export type MaterialStatus = 'available' | 'reserved' | 'low_stock' | 'out_of_stock';
export type QuantityUnit = 'units' | 'kg' | 'm2' | 'm' | 'pieces';

export interface MaterialInventory {
  id: string;

  // Identificación
  material_code: string;
  material_name: string;
  material_grade?: string;

  // Dimensiones
  dimensions?: string;
  thickness?: number;
  width?: number;
  length?: number;
  weight_kg?: number;

  // Stock
  quantity_available: number;
  quantity_reserved: number;
  quantity_unit: QuantityUnit;

  // Ubicación
  warehouse_location?: string;
  bin_location?: string;

  // Proveedor
  supplier_id?: string;
  supplier_name?: string;

  // Costos
  cost_per_unit?: number;
  last_purchase_date?: Date;

  // Límites
  reorder_point: number;
  reorder_quantity: number;

  // Estado
  status: MaterialStatus;

  // Metadata
  metadata: Record<string, any>;

  created_at: Date;
  updated_at: Date;
}

export interface CreateMaterialInventoryInput {
  material_code: string;
  material_name: string;
  material_grade?: string;
  dimensions?: string;
  thickness?: number;
  width?: number;
  length?: number;
  quantity_available: number;
  quantity_unit?: QuantityUnit;
  warehouse_location?: string;
  supplier_id?: string;
  supplier_name?: string;
  cost_per_unit?: number;
  reorder_point?: number;
  reorder_quantity?: number;
}

export interface CheckStockParams {
  material_code: string;
  quantity_needed: number;
  dimensions?: string;
}

export interface StockCheckResult {
  in_stock: boolean;
  available: number;
  location?: string;
  supplier_name?: string;
  needs_reorder: boolean;
}

// ==================== RAG Service ====================

export interface RAGConfig {
  embedding_model: string;
  embedding_dimensions: number;
  max_tokens_per_context: number;
  default_match_count: number;
  default_match_threshold: number;
  cache_ttl_seconds: number;
}

export interface RAGContext {
  query: string;
  agent_type: AgentType;
  retrieved_docs: SearchResult[];
  formatted_context: string;
  token_count: number;
  retrieval_time_ms: number;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ==================== Tool Types ====================

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
  default?: any;
}

export interface Tool {
  name: string;
  description: string;
  agent_type: AgentType;
  parameters: ToolParameter[];
  returns: {
    type: string;
    description: string;
  };
  execute: (params: any) => Promise<any>;
}

export interface ToolCall {
  tool_name: string;
  parameters: Record<string, any>;
  timestamp: Date;
}

export interface ToolResult {
  tool_name: string;
  success: boolean;
  result?: any;
  error?: string;
  execution_time_ms: number;
  timestamp: Date;
}

// ==================== Context Engineering ====================

export interface ContextBudget {
  system_prompt: number;
  rag_context: number;
  conversation_history: number;
  user_memory: number;
  tool_results: number;
  max_total: number;
}

export interface ContextAllocation {
  budget: ContextBudget;
  actual: {
    system_prompt: number;
    rag_context: number;
    conversation_history: number;
    user_memory: number;
    tool_results: number;
    total: number;
  };
  remaining: number;
  exceeded: boolean;
}

export interface OptimizedContext {
  system_prompt: string;
  rag_context: string;
  conversation_summary: string;
  user_memory_summary: string;
  tool_results_summary: string;
  allocation: ContextAllocation;
}

// ==================== Agent Enhanced Types ====================

export interface EnhancedAgentContext {
  // Original context
  userMemory?: any;
  classification?: any;
  fileInfo?: any;
  memoryContext?: string;

  // Enhanced with RAG
  rag_context?: RAGContext;

  // Enhanced with Tools
  available_tools: Tool[];
  previous_tool_calls?: ToolCall[];
  previous_tool_results?: ToolResult[];

  // Context optimization
  token_budget: ContextBudget;
  optimized_context?: OptimizedContext;
}

export interface AgentResponse {
  response: string;
  tool_calls?: ToolCall[];
  retrieved_knowledge?: SearchResult[];
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata: {
    agent: string;
    intent: string;
    confidence: number;
    processing_time: number;
    rag_used: boolean;
    tools_used: string[];
  };
}

// ==================== Utility Types ====================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}
