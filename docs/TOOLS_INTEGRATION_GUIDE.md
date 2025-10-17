# 🔧 Tools Integration Guide

## Quick Start: Integrating Tools with Agents

Esta guía muestra cómo integrar las tools creadas con los agentes usando OpenAI function calling.

---

## 1. Material Agent con Tools

### Paso 1: Importar Tools

```typescript
// En mastra/agents/material.agent.ts
import {
  checkMaterialStock,
  getMaterialProperties,
  findMaterialSupplier,
  suggestAlternatives,
  materialToolsSchema,
} from '@/lib/tools/material.tools';
```

### Paso 2: Configurar Tools en el Agente

```typescript
export const materialAgent = {
  ...AGENTS_CONFIG.material,

  async execute(params: AgentExecutionContext): Promise<string> {
    const { messages, context } = params;
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMessage?.content || '';

    // Obtener contexto RAG
    const ragContext = await generateRAGContext(query, 'material', {
      max_results: 5,
      match_threshold: 0.6,
    });

    const systemPrompt = `${AGENTS_CONFIG.material.system}

${ragContext.formatted_context}

HERRAMIENTAS DISPONIBLES:
Tienes acceso a estas herramientas para responder consultas:
1. checkMaterialStock: Verifica disponibilidad en inventario
2. getMaterialProperties: Obtiene propiedades técnicas
3. findMaterialSupplier: Encuentra proveedor de material
4. suggestAlternatives: Sugiere materiales alternativos

Usa las herramientas cuando necesites información precisa y actualizada.`;

    try {
      // Llamada a OpenAI con function calling
      const response = await generateResponse({
        model: 'standard',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.5,
        maxTokens: 1500,
        // Añadir tools
        tools: [
          { type: 'function', function: materialToolsSchema.checkMaterialStock },
          { type: 'function', function: materialToolsSchema.getMaterialProperties },
          { type: 'function', function: materialToolsSchema.findMaterialSupplier },
          { type: 'function', function: materialToolsSchema.suggestAlternatives },
        ],
        tool_choice: 'auto', // Dejar que el modelo decida
      });

      // Si el modelo solicita tool calls
      if (response.tool_calls) {
        const toolResults = await executeTools(response.tool_calls);

        // Segunda llamada con resultados de tools
        const finalResponse = await generateResponse({
          model: 'standard',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            { role: 'assistant', content: response.content, tool_calls: response.tool_calls },
            ...toolResults.map(r => ({
              role: 'tool',
              tool_call_id: r.tool_call_id,
              content: JSON.stringify(r.result),
            })),
          ],
          temperature: 0.5,
          maxTokens: 1500,
        });

        return finalResponse;
      }

      return response;
    } catch (error) {
      log('error', 'Material Agent error', error);
      return 'Error procesando consulta';
    }
  },
};

// Helper para ejecutar tools
async function executeTools(toolCalls: any[]) {
  const results = [];

  for (const toolCall of toolCalls) {
    const { name, arguments: args } = toolCall.function;
    let result;

    switch (name) {
      case 'checkMaterialStock':
        result = await checkMaterialStock(JSON.parse(args));
        break;
      case 'getMaterialProperties':
        result = await getMaterialProperties(JSON.parse(args));
        break;
      case 'findMaterialSupplier':
        result = await findMaterialSupplier(JSON.parse(args));
        break;
      case 'suggestAlternatives':
        result = await suggestAlternatives(JSON.parse(args));
        break;
      default:
        result = { error: 'Unknown tool' };
    }

    results.push({
      tool_call_id: toolCall.id,
      result,
    });
  }

  return results;
}
```

---

## 2. Proveedores Agent con Tools

### Paso 1: Importar Tools

```typescript
// En mastra/agents/proveedores.agent.ts
import {
  searchProviders,
  getProviderInfo,
  generateProviderEmail,
  getMaterialSupplierEmail,
  checkIfServiceIsExternal,
  providersToolsSchema,
} from '@/lib/tools/providers.tools';
```

### Paso 2: Configurar Tools

```typescript
export const proveedoresAgent = {
  ...AGENTS_CONFIG.proveedores,

  async execute(params: AgentExecutionContext): Promise<string> {
    // Similar al Material Agent, pero con estas tools:
    const tools = [
      { type: 'function', function: providersToolsSchema.searchProviders },
      { type: 'function', function: providersToolsSchema.getProviderInfo },
      { type: 'function', function: providersToolsSchema.generateProviderEmail },
      { type: 'function', function: providersToolsSchema.getMaterialSupplierEmail },
      { type: 'function', function: providersToolsSchema.checkIfServiceIsExternal },
    ];

    // ... rest of implementation similar to Material Agent
  },
};
```

---

## 3. Actualizar generateResponse para Soportar Tools

### En mastra/index.ts

```typescript
export async function generateResponse(options: {
  model: 'fast' | 'standard' | 'advanced';
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  tools?: any[]; // Añadir soporte para tools
  tool_choice?: 'auto' | 'none' | 'required';
}): Promise<any> {
  const {
    model,
    messages,
    temperature = 0.7,
    maxTokens = 2000,
    tools,
    tool_choice = 'auto',
  } = options;

  const modelName = getModelName(model);

  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      tools, // Pasar tools a OpenAI
      tool_choice,
    });

    const response = completion.choices[0].message;

    // Si hay tool calls, retornar con metadata
    if (response.tool_calls) {
      return {
        content: response.content || '',
        tool_calls: response.tool_calls,
      };
    }

    return response.content || '';
  } catch (error: any) {
    log('error', 'Error generating response', { error: error.message });
    throw error;
  }
}
```

---

## 4. Ejemplo de Flujo Completo

### Usuario pregunta: "¿Tenéis aluminio 7075 en stock?"

```
1. Intent Classification → Ruta a Material Agent

2. Material Agent:
   - Genera RAG context (encuentra docs sobre AA7075)
   - El modelo ve que necesita verificar stock
   - Llama a tool: checkMaterialStock({ material_code: "AA7075" })

3. Tool Execution:
   - Consulta tabla material_inventory en Supabase
   - Retorna: { available: true, quantity_kg: 150, dimensions: [...] }

4. Material Agent (segunda llamada):
   - Recibe resultado de la tool
   - Genera respuesta natural:
     "Sí, tenemos aluminio 7075-T6 disponible en stock. Actualmente
      contamos con 150 kg en las siguientes dimensiones: [...]"
```

### Usuario pregunta: "Necesito anodizar piezas de titanio"

```
1. Intent Classification → Ruta a Proveedores Agent

2. Proveedores Agent:
   - Genera RAG context (encuentra docs sobre anodizado y proveedores)
   - El modelo detecta servicio externo
   - Llama a tool 1: checkIfServiceIsExternal({ service_description: "anodizado" })
   - Resultado: { is_external: true, reason: "Arkcutt NO realiza anodizado..." }

   - Llama a tool 2: searchProviders({ service_type: "anodizado", material: "titanio" })
   - Resultado: [{ provider_name: "TreatMetal Pro", contact_email: "...", ... }]

   - Llama a tool 3: getProviderInfo({ provider_name: "TreatMetal Pro" })
   - Resultado: { services: [...], estimated_turnaround: "5-7 días", ... }

3. Proveedores Agent (respuesta final):
   "El servicio de anodizado no lo realizamos en Arkcutt (solo mecanizado CNC).
    Sin embargo, trabajamos con TreatMetal Pro, especialistas en tratamientos
    de titanio. Ofrecen anodizado tipo II y III con certificación, tiempo
    estimado 5-7 días. ¿Le gustaría que generara un email de solicitud de
    cotización?"
```

---

## 5. Ventajas del Sistema

### Sin Tools (Antes)
```
User: "¿Tenéis AA7075?"
Agent: "Sí, generalmente tenemos AA7075. Es un material común..."
```
**Problema**: Respuesta genérica, no verifica stock real

### Con Tools (Ahora)
```
User: "¿Tenéis AA7075?"
Agent: [Llama checkMaterialStock]
Agent: "Sí, tenemos 150 kg de AA7075-T6 en stock en dimensiones
       200x100x50mm y 300x200x25mm. Última actualización: 2025-10-15"
```
**Ventaja**: Respuesta precisa con datos reales

---

## 6. Error Handling

```typescript
async function executeToolSafely(toolName: string, args: any) {
  try {
    const result = await executeTool(toolName, args);
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    log('error', `Tool ${toolName} failed`, { error: error.message });
    return {
      success: false,
      error: error.message,
      fallback: 'No se pudo obtener información actualizada. Responde con conocimiento general.',
    };
  }
}
```

---

## 7. Testing Tools

### Test Individual Tool

```typescript
// tests/tools/material.test.ts
import { checkMaterialStock } from '@/lib/tools/material.tools';

describe('Material Tools', () => {
  it('should check material stock', async () => {
    const result = await checkMaterialStock({
      material_code: 'AA7075'
    });

    expect(result).toHaveProperty('available');
    expect(result).toHaveProperty('material_code');
  });
});
```

### Test Tool Integration with Agent

```typescript
// tests/agents/material-with-tools.test.ts
describe('Material Agent with Tools', () => {
  it('should use checkMaterialStock when asked about availability', async () => {
    const messages = [
      { role: 'user', content: '¿Tenéis aluminio 7075?' }
    ];

    const response = await materialAgent.execute({ messages, context: {} });

    // Verificar que la respuesta incluye info de stock real
    expect(response).toContain('kg');
    expect(response).toContain('stock');
  });
});
```

---

## 8. Monitoring & Observability

### Logging Tool Calls

```typescript
async function executeToolWithLogging(toolName: string, args: any) {
  const startTime = Date.now();

  log('info', `🔧 Tool call: ${toolName}`, { args });

  try {
    const result = await executeTool(toolName, args);
    const duration = Date.now() - startTime;

    log('info', `✅ Tool ${toolName} succeeded in ${duration}ms`, {
      result_preview: JSON.stringify(result).substring(0, 100),
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    log('error', `❌ Tool ${toolName} failed after ${duration}ms`, {
      error: error.message,
    });

    throw error;
  }
}
```

---

## 9. Next Steps

1. **Implementar tool execution en agentes actuales**
   - Modificar `material.agent.ts`
   - Modificar `proveedores.agent.ts`

2. **Crear tests de integración**
   - Test completo de flujo con tools
   - Test de error handling

3. **Añadir más tools según necesidad**
   - Budget calculator tool
   - File processor tool
   - CRM integration tool

4. **Optimizar performance**
   - Cache de resultados de tools
   - Parallel tool execution cuando sea posible
   - Rate limiting

---

## 📚 Referencias

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Context Engineering Architecture](../CONTEXT_ENGINEERING_ARCHITECTURE.md)
- [Implementation Guide](../CONTEXT_ENGINEERING_IMPLEMENTATION.md)

---

**Última actualización**: 2025-10-17
