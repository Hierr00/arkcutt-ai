# 🧠 Sistema de Memoria Nativo con Mastra

## Descripción General

El sistema de memoria implementado para Arkcutt AI proporciona capacidades de memoria conversacional tanto a corto como a largo plazo, permitiendo que los agentes mantengan contexto y personalicen sus respuestas basándose en interacciones previas.

## Arquitectura

### 1. Memoria a Corto Plazo (Short-Term Memory)

**Ubicación:** En memoria (RAM) - `Map<sessionId, ShortTermMemory>`

**Características:**
- Almacena los últimos 20 mensajes de la conversación actual
- Mantiene entidades extraídas (materiales, servicios, cantidades, etc.)
- Registra intents detectados durante la sesión
- Se limpia automáticamente después de 1 hora de inactividad

**Casos de uso:**
- Mantener contexto conversacional durante una sesión
- Permitir referencias a mensajes anteriores ("el material que mencioné antes")
- Acumular información progresivamente en una solicitud

### 2. Memoria a Largo Plazo (Long-Term Memory)

**Ubicación:** Supabase - tabla `user_memory`

**Características:**
- Persistente entre sesiones
- Almacena preferencias del usuario
- Mantiene hechos importantes extraídos de conversaciones
- Registra historial de proyectos
- Identifica patrones de solicitudes frecuentes

**Casos de uso:**
- Personalizar respuestas basándose en preferencias conocidas
- Recordar restricciones o requisitos del cliente
- Sugerir opciones basadas en historial
- Identificar clientes recurrentes y sus necesidades típicas

## Componentes Principales

### MemoryManager (`memory-manager.ts`)

**Funciones principales:**

1. **`getMemoryContext(sessionId, userId?)`**
   - Obtiene contexto completo de memoria (corto + largo plazo)
   - Selecciona hechos relevantes automáticamente
   - Retorna: `MemoryContext`

2. **`addMessage(sessionId, message)`**
   - Añade un mensaje a la memoria a corto plazo
   - Usado para mensajes de usuario y agente

3. **`updateSessionEntities(sessionId, entities)`**
   - Actualiza entidades extraídas en la sesión actual
   - Merge inteligente (evita duplicados)

4. **`updateSessionIntents(sessionId, intent)`**
   - Registra intents detectados en la sesión

5. **`updateMemory(update: MemoryUpdate)`**
   - Actualiza memoria a largo plazo en Supabase
   - Añade nuevos hechos, preferencias o proyectos

6. **`extractFactsFromConversation(messages, userId)`**
   - Usa LLM para extraer hechos importantes de la conversación
   - Categoriza: preference, requirement, constraint, feedback
   - Asigna confidence score

7. **`formatMemoryForAgent(context)`**
   - Formatea el contexto de memoria para incluirlo en prompts de agentes
   - Resume información relevante de forma clara

## Flujo de Integración en Workflows

### En `budget-request.workflow.ts`:

```typescript
// 1. Obtener contexto de memoria al inicio
const memoryContext = await getMemoryContext(sessionId, userId);

// 2. Añadir mensaje del usuario
addMessage(sessionId, { role: 'user', content: lastMessage });

// 3. Clasificar intent y actualizar memoria de sesión
const classification = await classifyIntent(...);
updateSessionIntents(sessionId, classification.intent);
updateSessionEntities(sessionId, classification.entities);

// 4. Formatear para agentes
const memoryContextForAgent = formatMemoryForAgent(memoryContext);

// 5. Ejecutar agente con contexto
const response = await agent.execute({
  messages,
  context: { memoryContext: memoryContextForAgent, ... }
});

// 6. Añadir respuesta del agente
addMessage(sessionId, { role: 'assistant', content: response });

// 7. Extraer y persistir hechos (cada 4 mensajes)
if (memoryContext.shortTerm.messages.length >= 4) {
  const newFacts = await extractFactsFromConversation(...);
  await updateMemory({ userId, sessionId, newFacts });
}
```

## Tipos de Datos

### MemorizedFact

```typescript
{
  id: string;
  content: string;
  category: 'preference' | 'requirement' | 'constraint' | 'feedback';
  confidence: number; // 0.0 - 1.0
  source: 'explicit' | 'inferred';
  timestamp: Date;
  relevanceCount: number; // Incrementa cuando es usado
}
```

**Ejemplos:**
- `{ content: "Prefiere aluminio 7075 para prototipado", category: "preference", confidence: 0.9, source: "explicit" }`
- `{ content: "Requiere certificación ISO para todas las piezas", category: "requirement", confidence: 1.0, source: "explicit" }`
- `{ content: "Presupuesto limitado a 1000€", category: "constraint", confidence: 0.8, source: "inferred" }`

### UserPreferences

```typescript
{
  preferredMaterials?: string[];
  typicalQuantities?: string; // "prototipos" | "producción media" | "producción alta"
  communicationStyle?: 'technical' | 'simple';
  industry?: string;
  location?: string;
}
```

## Configuración en Agentes

Los agentes reciben el contexto de memoria en su prompt:

```typescript
const systemPrompt = `...

${memoryContext ? `
🧠 CONTEXTO DE MEMORIA:
${memoryContext}
` : ''}

INSTRUCCIONES:
...
5. Si hay información de memoria, úsala para personalizar tu respuesta
...`;
```

Esto permite que los agentes:
- Reconozcan clientes recurrentes
- Ajusten el tono basándose en preferencias
- Sugieran opciones basadas en historial
- Eviten preguntar información ya conocida

## Estrategia de Extracción de Hechos

### Cuándo extraer:
- Cada 4 mensajes (2 intercambios completos)
- Al finalizar una solicitud de presupuesto
- Cuando el usuario proporciona información explícita de preferencias

### Qué extraer:
✅ **Preferencias explícitas:** "Siempre uso aluminio 6061"
✅ **Requisitos técnicos:** "Necesito tolerancia ±0.05mm"
✅ **Restricciones:** "No puedo superar X presupuesto"
✅ **Feedback:** "La última entrega llegó tarde"

❌ **NO extraer:**
- Información temporal o específica de una conversación única
- Hechos con baja confianza
- Información contradictoria sin resolver

## Gestión de Privacidad

### Datos almacenados:
- Preferencias técnicas (materiales, servicios)
- Requisitos de negocio (tolerancias, cantidades)
- Historial de proyectos (sin datos sensibles)

### Datos NO almacenados:
- Información de pago
- Datos personales sensibles
- Información confidencial de proyectos

### Limpieza:
- Sesiones inactivas > 1 hora: limpiadas automáticamente
- Memoria a largo plazo: mantenida hasta que el usuario la elimine
- RLS policies en Supabase aseguran que usuarios solo accedan su propia memoria

## Beneficios del Sistema

1. **Experiencia Personalizada**
   - Respuestas adaptadas a preferencias conocidas
   - Menos preguntas repetitivas

2. **Eficiencia**
   - Menos ida y vuelta para obtener información
   - Sugerencias proactivas basadas en historial

3. **Contexto Conversacional**
   - Referencias naturales a mensajes anteriores
   - Construcción progresiva de solicitudes complejas

4. **Aprendizaje Continuo**
   - Sistema mejora con cada interacción
   - Identificación de patrones de clientes

## Mantenimiento

### Monitoreo:
- Revisar logs: `🧠 [Memory]` messages
- Verificar crecimiento de tabla `user_memory`
- Monitorear tiempo de respuesta de queries de memoria

### Optimización:
- Ajustar `MAX_MESSAGES` si hay problemas de contexto
- Ajustar frecuencia de extracción de hechos
- Implementar archivado de hechos antiguos con baja relevance

### Debugging:
```bash
# Ver memoria de una sesión específica
# Los logs muestran:
# - Mensajes cargados
# - Hechos relevantes seleccionados
# - Hechos extraídos y guardados
```

## Próximos Pasos (Futuro)

- [ ] Implementar vector embeddings para búsqueda semántica de hechos
- [ ] Añadir sistema de confidence decay (hechos antiguos pierden confianza)
- [ ] Implementar merge inteligente de hechos contradictorios
- [ ] Dashboard para que usuarios vean/editen su memoria
- [ ] Exportación de memoria del usuario (GDPR compliance)
