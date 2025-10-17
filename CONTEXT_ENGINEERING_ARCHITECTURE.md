# 🎯 Arquitectura de Context Engineering para Arkcutt AI

## Visión General

Sistema de agentes AI con **Context Engineering** para automatizar el flujo completo de solicitud de presupuestos en mecanizado CNC industrial, desde la consulta del cliente hasta la gestión de proveedores externos.

## Flujo de Negocio Real

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE HACE CONSULTA                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              INTENT CLASSIFICATION (Determinista)               │
│  ¿Materiales? ¿Servicios? ¿Presupuesto? ¿Consulta técnica?    │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  MATERIAL   │  │ INGENIERÍA  │  │ PROVEEDORES │
    │   AGENT     │  │   AGENT     │  │   AGENT     │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                 │
           └────────────────┴─────────────────┘
                             │
                             ▼
               ┌─────────────────────────┐
               │  CONSOLIDAR RESPUESTA   │
               │  + GENERAR PRESUPUESTO  │
               └─────────────────────────┘
```

## Arquitectura de Componentes

### 1. Material Agent - Gestión de Materiales

**Responsabilidades:**
- Resolver consultas técnicas sobre materiales
- Verificar disponibilidad en stock
- Identificar proveedores cuando no hay stock
- Sugerir alternativas de materiales

**RAG Knowledge Base:**
```
materials_knowledge/
├── properties/           # Propiedades técnicas (dureza, densidad, etc.)
├── applications/         # Casos de uso (aeronáutica, automotriz, etc.)
├── dimensions/           # Medidas disponibles para trabajar
├── treatments/           # Tratamientos compatibles
└── suppliers/            # Proveedores de confianza por material
```

**Tools Disponibles:**
1. `checkMaterialStock(material, dimensions, quantity)`
   - Input: Material (ej: "AA7075"), dimensiones, cantidad
   - Output: { inStock: boolean, available: number, location: string }
   - Consulta base de datos de stock real

2. `getMaterialProperties(material)`
   - Input: Material code
   - Output: { density, hardness, tensileStrength, applications, ... }
   - Datos técnicos exactos del material

3. `findMaterialSupplier(material)`
   - Input: Material
   - Output: { supplier, leadTime, minOrder, notes, contactInfo }
   - Busca proveedor de confianza en BD

4. `suggestAlternatives(material, requirements)`
   - Input: Material deseado + requisitos técnicos
   - Output: [{ material, reason, compatibility }]
   - Sugiere alternativas basándose en propiedades

**Flujo de Trabajo:**
```
Cliente: "Necesito 50 unidades de aluminio 7075 de 100x200mm"
    ↓
Material Agent:
    1. RAG Search → Propiedades AA7075
    2. Tool: checkMaterialStock("AA7075", "100x200", 50)
       → Result: { inStock: false, available: 0 }
    3. Tool: findMaterialSupplier("AA7075")
       → Result: { supplier: "MetalStock Pro", leadTime: "5 días" }
    4. Genera respuesta + pasa info a Proveedores Agent
```

---

### 2. Ingeniería Agent - Soporte Técnico

**Responsabilidades:**
- Resolver dudas técnicas de fabricación
- Validar viabilidad del proyecto
- Sugerir mejoras de diseño
- Gestionar especificaciones técnicas (tolerancias, acabados)

**RAG Knowledge Base:**
```
engineering_knowledge/
├── capabilities/         # Qué puede hacer la empresa (solo CNC metal)
├── tolerances/           # Tolerancias alcanzables
├── processes/            # Procesos de mecanizado disponibles
├── limitations/          # Limitaciones técnicas (tamaño máx, etc.)
└── best_practices/       # Mejores prácticas por aplicación
```

**Tools Disponibles:**
1. `validateTechnicalFeasibility(specs)`
   - Input: Especificaciones técnicas del proyecto
   - Output: { feasible: boolean, issues: [], suggestions: [] }
   - Valida contra capacidades reales de la empresa

2. `calculateTolerances(process, material)`
   - Input: Proceso de mecanizado + material
   - Output: { achievable: string, recommended: string, cost_impact: string }
   - Calcula tolerancias alcanzables

3. `suggestProcessOptimizations(specs)`
   - Input: Specs del proyecto
   - Output: [{ optimization, benefit, cost_impact }]
   - Sugiere mejoras de proceso

---

### 3. Proveedores Agent - Gestión de Subcontratación

**Responsabilidades:**
- Identificar servicios que la empresa NO hace (todo excepto CNC metal)
- Buscar proveedores para servicios externos
- Generar emails de solicitud de presupuesto a proveedores
- Gestionar pedidos de material sin stock

**Capacidades Internas (SOLO ESTO):**
- ✅ Mecanizado CNC de metal
- ❌ Tratamientos superficiales → PROVEEDOR
- ❌ Soldadura → PROVEEDOR
- ❌ Pintura → PROVEEDOR
- ❌ Certificaciones → PROVEEDOR
- ❌ Corte láser no metales → PROVEEDOR

**RAG Knowledge Base:**
```
providers_knowledge/
├── services/             # Catálogo de servicios externos
├── providers/            # Base de datos de proveedores
│   ├── treatments/       # Proveedores de tratamientos
│   ├── welding/          # Proveedores de soldadura
│   ├── certifications/   # Laboratorios certificación
│   └── materials/        # Proveedores de materiales
├── provider_notes/       # Notas sobre cada proveedor
│   ├── "Proveedor X: siempre pedir 2 semanas antes"
│   ├── "Proveedor Y: excelente para titanio"
│   └── ...
└── email_templates/      # Templates de emails por servicio
```

**Tools Disponibles:**
1. `identifyExternalServices(projectRequirements)`
   - Input: Requisitos completos del proyecto
   - Output: [{ service, reason, priority }]
   - Identifica qué necesita subcontratación

2. `searchProviders(service, criteria)`
   - Input: Servicio requerido + criterios (material, zona, etc.)
   - Output: [{ provider, rating, specialty, leadTime, notes }]
   - Busca proveedores apropiados

3. `getProviderInfo(providerId)`
   - Input: ID del proveedor
   - Output: { name, contact, services, notes, history, preferences }
   - Info detallada del proveedor de confianza

4. `generateProviderEmail(provider, service, specs)`
   - Input: Proveedor + servicio + especificaciones
   - Output: { to, subject, body, attachments }
   - Genera email profesional con todos los detalles

5. `getMaterialSupplierEmail(material, quantity, dimensions, deadline)`
   - Input: Material + cantidad + dims + plazo
   - Output: { to, subject, body }
   - Genera email para pedir material

**Flujo de Trabajo - Ejemplo Completo:**
```
Cliente: "Necesito 20 piezas de titanio grado 5, mecanizadas,
         con anodizado azul y certificación ISO"

1. Material Agent analiza:
   - Tool: checkMaterialStock("Ti-6Al-4V", quantity=20)
   - Result: No stock
   - Tool: findMaterialSupplier("Ti-6Al-4V")
   - Result: "TitanSupply España" (proveedor confianza)
   - Pasa a Proveedores Agent

2. Ingeniería Agent valida:
   - Tool: validateTechnicalFeasibility(specs)
   - Result: ✅ Mecanizado OK, ❌ Anodizado NO, ❌ Certificación NO
   - Pasa servicios externos a Proveedores Agent

3. Proveedores Agent gestiona:
   a) Material sin stock:
      - Tool: getProviderInfo("TitanSupply España")
      - Result: { contact: "ventas@...", notes: "Pedir 3 sem antes" }
      - Tool: getMaterialSupplierEmail(...)
      - Genera email para pedir titanio

   b) Servicios externos:
      - Tool: identifyExternalServices(...)
      - Result: ["anodizado", "certificación ISO"]

      - Tool: searchProviders("anodizado", {material: "titanio"})
      - Result: "TreatMetal Pro" (especialistas titanio)

      - Tool: getProviderInfo("TreatMetal Pro")
      - Result: { specialty: "anodizado aeronáutico", notes: "..." }

      - Tool: generateProviderEmail("TreatMetal Pro", "anodizado", specs)
      - Genera email detallado

      - Tool: searchProviders("certificación ISO")
      - Result: "CertLab Madrid"

      - Tool: generateProviderEmail("CertLab Madrid", "certificación", specs)
      - Genera email con requisitos

4. Sistema consolida:
   - Presupuesto interno: Mecanizado CNC
   - Presupuesto externo pendiente: Material + Anodizado + Certificación
   - Emails generados listos para enviar
```

---

## Sistema RAG (Retrieval-Augmented Generation)

### Arquitectura RAG

```
┌──────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE BASES                           │
├──────────────────────────────────────────────────────────────┤
│  Materials KB  │  Engineering KB  │  Providers KB            │
│  - Properties  │  - Capabilities  │  - Services catalog      │
│  - Dimensions  │  - Tolerances    │  - Providers DB          │
│  - Suppliers   │  - Processes     │  - Provider notes        │
└────────┬───────────────┬─────────────────┬───────────────────┘
         │               │                 │
         ▼               ▼                 ▼
    ┌────────────────────────────────────────┐
    │      EMBEDDING MODEL (OpenAI)          │
    │      text-embedding-3-small            │
    └────────────────┬───────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │     VECTOR DATABASE (Supabase pgvector)│
    │     - Semantic search                   │
    │     - Top-K retrieval                   │
    │     - Metadata filtering                │
    └────────────────┬───────────────────────┘
                     │
                     ▼
         ┌──────────────────────┐
         │   AGENT CONTEXT      │
         │   (Only relevant     │
         │    information)      │
         └──────────────────────┘
```

### Estructura de Vector Store

**Tabla: `knowledge_embeddings`**
```sql
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY,
  agent_type TEXT, -- 'material' | 'engineering' | 'providers'
  category TEXT,   -- 'properties' | 'suppliers' | 'notes' | etc.
  content TEXT,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops);
```

**Ejemplo de Documentos:**

```json
// Material Knowledge
{
  "agent_type": "material",
  "category": "properties",
  "content": "Aluminio 7075-T6: Alta resistencia mecánica (570 MPa tensión), excelente relación resistencia/peso, usado en aeronáutica y componentes estructurales. Mecanizable pero requiere herramientas adecuadas.",
  "metadata": {
    "material_code": "AA7075",
    "applications": ["aeronautica", "automocion", "deportivo"],
    "density": 2.81,
    "hardness": "150 HB"
  }
}

// Provider Knowledge
{
  "agent_type": "providers",
  "category": "provider_notes",
  "content": "MetalStock Pro: Proveedor principal de aluminios aeronáuticos. IMPORTANTE: Siempre solicitar con 2 semanas de antelación, mínimo pedido 100kg. Excelente calidad AA7075 con certificaciones. Contacto: ventas@metalstock.es",
  "metadata": {
    "provider_id": "msp_001",
    "services": ["material_supply"],
    "materials": ["AA7075", "AA2024", "AA6061"],
    "lead_time_days": 14
  }
}
```

---

## Tools Framework

### Tool Registry (Supabase)

**Tabla: `agent_tools`**
```sql
CREATE TABLE agent_tools (
  id UUID PRIMARY KEY,
  tool_name TEXT UNIQUE,
  agent_type TEXT,
  description TEXT,
  parameters JSONB,
  implementation_type TEXT, -- 'database' | 'api' | 'function'
  endpoint TEXT,
  created_at TIMESTAMP
);
```

### Tool Execution Engine

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
  };
  execute: (params: any) => Promise<any>;
}

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool) { ... }

  async execute(toolName: string, params: any) {
    const tool = this.tools.get(toolName);
    const result = await tool.execute(params);
    return result;
  }
}
```

---

## Context Optimization

### Smart Context Selection

**Antes (❌ Ineficiente):**
```
Prompt size: ~8000 tokens
- Base de datos COMPLETA de materiales: 5000 tokens
- Historial completo: 2000 tokens
- System prompt: 1000 tokens
```

**Después (✅ Optimizado):**
```
Prompt size: ~2000 tokens
- Top-3 materiales relevantes (RAG): 500 tokens
- Resumen de conversación: 300 tokens
- System prompt: 200 tokens
- Context de memoria: 500 tokens
- Tool results: 500 tokens
```

**Ahorro: 75% de tokens → Reducción de costos 75%**

### Token Budget Management

```typescript
const TOKEN_BUDGETS = {
  material: {
    systemPrompt: 200,
    ragContext: 500,
    conversationHistory: 300,
    userMemory: 300,
    toolResults: 500,
    maxTotal: 2000
  },
  engineering: { ... },
  providers: { ... }
};
```

---

## Structured Outputs

### Response Schemas

**Material Agent Output:**
```typescript
{
  type: "material_response",
  material_info: {
    material: string,
    properties: {...},
    availability: "in_stock" | "needs_order",
    supplier?: {...}
  },
  recommendations: string[],
  next_steps: string[],
  requires_provider_action: boolean,
  provider_request?: {...}
}
```

**Proveedores Agent Output:**
```typescript
{
  type: "provider_response",
  external_services: [
    {
      service: string,
      provider: {...},
      email_draft: {
        to: string,
        subject: string,
        body: string
      }
    }
  ],
  material_orders: [...],
  estimated_lead_time: number,
  total_external_cost_estimate?: number
}
```

---

## Knowledge Graph (Fase 2)

```
Material(AA7075)
  ├─ requires → Tool(carbide_tools)
  ├─ compatible_with → Treatment(anodizado)
  ├─ used_in → Application(aeronautica)
  ├─ supplied_by → Provider(MetalStock)
  └─ alternative_to → Material(AA2024)

Service(anodizado)
  ├─ works_on → [aluminum, titanium]
  ├─ provided_by → Provider(TreatMetal)
  └─ required_for → Application(aerospace_grade)
```

---

## Próximos Pasos de Implementación

### Fase 1: RAG System (AHORA)
- [ ] Crear tablas Supabase para embeddings
- [ ] Implementar generación de embeddings
- [ ] Popular knowledge bases iniciales
- [ ] Implementar semantic search
- [ ] Integrar RAG en agentes

### Fase 2: Tool-Calling Agents
- [ ] Crear tool registry
- [ ] Implementar tools de Material Agent
- [ ] Implementar tools de Proveedores Agent
- [ ] Tool execution engine
- [ ] Integrar tools con agentes

### Fase 3: Context Optimization
- [ ] Token budget management
- [ ] Smart context selection
- [ ] Context compression
- [ ] Cache de contexto frecuente

### Fase 4: Knowledge Graph
- [ ] Diseñar grafo de relaciones
- [ ] Implementar en Supabase
- [ ] Query engine para grafo
- [ ] Integrar con RAG

---

## Métricas de Éxito

**Mejoras Esperadas:**
- **Reducción de tokens:** 75% menos por consulta
- **Precisión:** >90% en recomendaciones de materiales
- **Automatización:** 80% de emails a proveedores generados automáticamente
- **Tiempo de respuesta:** <3s por consulta
- **Costos LLM:** Reducción 70%

---

## Stack Tecnológico

- **LLM:** OpenAI GPT-4o (agents), GPT-4o-mini (classification)
- **Embeddings:** OpenAI text-embedding-3-small
- **Vector DB:** Supabase pgvector
- **Database:** PostgreSQL (Supabase)
- **Framework:** Next.js 15 + TypeScript
- **Tools:** Custom tool registry + execution engine
