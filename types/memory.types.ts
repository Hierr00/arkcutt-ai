/**
 * 🧠 TIPOS: Sistema de Memoria
 * Gestión de contexto conversacional y memoria a largo plazo
 */

export interface ShortTermMemory {
  sessionId: string;
  messages: ConversationMessage[];
  entities: ExtractedEntities;
  intents: string[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface LongTermMemory {
  userId: string;
  preferences: UserPreferences;
  facts: MemorizedFact[];
  projectHistory: ProjectSummary[];
  frequentRequests: RequestPattern[];
  lastAccessed: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    agent?: string;
    entities?: any;
  };
}

export interface ExtractedEntities {
  materials?: string[];
  services?: string[];
  quantities?: number[];
  dimensions?: string[];
  treatments?: string[];
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

export interface UserPreferences {
  preferredMaterials?: string[];
  typicalQuantities?: string; // e.g., "prototipos", "producción media", "producción alta"
  communicationStyle?: 'technical' | 'simple';
  industry?: string;
  location?: string;
}

export interface MemorizedFact {
  id: string;
  content: string;
  category: 'preference' | 'requirement' | 'constraint' | 'feedback';
  confidence: number;
  source: 'explicit' | 'inferred';
  timestamp: Date;
  relevanceCount: number; // Cuántas veces ha sido relevante
}

export interface ProjectSummary {
  id: string;
  description: string;
  materials: string[];
  services: string[];
  budget?: number;
  timestamp: Date;
}

export interface RequestPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
}

export interface MemoryContext {
  shortTerm: ShortTermMemory;
  longTerm?: LongTermMemory;
  relevantFacts: MemorizedFact[];
}

export interface MemoryUpdate {
  userId?: string;
  sessionId: string;
  newFacts?: Omit<MemorizedFact, 'id' | 'timestamp' | 'relevanceCount'>[];
  updatedPreferences?: Partial<UserPreferences>;
  newProject?: Omit<ProjectSummary, 'id' | 'timestamp'>;
}
