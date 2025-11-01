# 🎯 ARQUITECTURA DEFINITIVA: Fin + Custom Actions

**Versión:** 3.0 (Definitiva)
**Fecha:** 2025-11-01
**Concepto clave:** Fin orquesta todo usando Workflows y Custom Actions que llaman a vuestras APIs

---

## ✅ ARQUITECTURA REAL USANDO FIN WORKFLOWS

```
┌──────────────────────────────────────────────────────────────┐
│  Email llega a ventas@arkcutt.com                            │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓ Tiempo real (< 1 seg)
┌──────────────────────────────────────────────────────────────┐
│              INTERCOM INBOX                                  │
│  • Recibe email instantáneamente                             │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓ Automático
┌──────────────────────────────────────────────────────────────┐
│         FIN WORKFLOW: "Email Router"                         │
│                                                              │
│  Step 1: Extract email metadata                              │
│    - from, subject, body, attachments                        │
│                                                              │
│  Step 2: Custom Action → Vuestra API                         │
│    POST /api/fin/classify-and-route                          │
│    {                                                         │
│      from: "email@example.com",                              │
│      subject: "Re: RFQ-123",                                 │
│      body: "Nuestro precio es...",                           │
│      thread_id: "conv_123",                                  │
│      attachments: [...]                                      │
│    }                                                         │
│                                                              │
│  Step 3: Esperar respuesta de API (< 2 seg)                  │
│    Response:                                                 │
│    {                                                         │
│      routing_decision: "PROVIDER_RESPONSE",                  │
│      action: "CLOSE_AND_PROCESS_EXTERNALLY",                 │
│      metadata: { rfq_id: 123 }                               │
│    }                                                         │
│    O                                                         │
│    {                                                         │
│      routing_decision: "CUSTOMER_INQUIRY",                   │
│      action: "CONTINUE_WITH_FIN",                            │
│      context: { existing_customer: true, ... }               │
│    }                                                         │
│                                                              │
│  Step 4: Branch según respuesta                              │
│    IF action = "CONTINUE_WITH_FIN":                          │
│      → Fin procesa normalmente (solicita datos, etc)         │
│                                                              │
│    IF action = "CLOSE_AND_PROCESS_EXTERNALLY":               │
│      → Fin cierra conversación                               │
│      → Envía mensaje: "Gracias, procesaremos tu respuesta"   │
│      → NO continúa conversación                              │
│                                                              │
│    IF action = "ESCALATE_TO_HUMAN":                          │
│      → Fin asigna a equipo humano                            │
│      → Tag: "needs-human-review"                             │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓ Si CONTINUE_WITH_FIN
┌──────────────────────────────────────────────────────────────┐
│         FIN: Proceso Normal de Cotización                    │
│                                                              │
│  • Solicita datos faltantes (material, cantidad, etc)        │
│  • Analiza adjuntos técnicos                                 │
│  • Consulta disponibilidad (Custom Action → ERP API)         │
│  • Confirma información completa                             │
│                                                              │
│  Cuando tiene todo:                                          │
│    Custom Action → POST /api/fin/quotation-complete          │
│    {                                                         │
│      customer_email: "...",                                  │
│      quotation_data: { material, quantity, ... },            │
│      needs_external_services: ["anodizado"]                  │
│    }                                                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│      VUESTRO BACKEND (Next.js API Routes)                    │
│                                                              │
│  /api/fin/classify-and-route                                 │
│    - Consulta DB: ¿email en provider_contacts?              │
│    - Consulta DB: ¿thread_id existente de cliente?          │
│    - Aplica reglas: ¿spam? ¿out of scope?                   │
│    - Retorna decisión en < 1 seg                             │
│                                                              │
│  /api/fin/quotation-complete                                 │
│    - Crea quotation_request en DB                            │
│    - Si necesita externos: busca proveedores                 │
│    - Envía RFQs a proveedores                                │
│    - Retorna confirmación                                    │
│                                                              │
│  /api/fin/check-inventory (Custom Action)                    │
│    - Consulta ERP/sistema inventario                         │
│    - Retorna stock disponible                                │
│    - Fin lo usa en conversación: "Tenemos stock de X"        │
│                                                              │
│  /api/providers/process-response (webhook)                   │
│    - Procesa respuestas de proveedores que fueron CLOSED     │
│    - Providers Agent OSS extrae datos                        │
│    - Actualiza external_quotations                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│              DATABASE (Supabase)                             │
│  • quotation_requests                                        │
│  • external_quotations                                       │
│  • provider_contacts ← Clave para clasificación              │
│  • routing_logs                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTACIÓN: Fin Workflows

### Workflow 1: Email Router (Primera línea de defensa)

```yaml
# Intercom → Fin → Workflows → Create "Email Router"

Name: "Email Router"
Trigger: "When new conversation starts"
Priority: HIGHEST (ejecuta ANTES que otros workflows)

Steps:
  1. Extract Variables:
     - email_from = {{conversation.user.email}}
     - email_subject = {{conversation.source.subject}}
     - email_body = {{conversation.source.body}}
     - thread_id = {{conversation.id}}
     - has_attachments = {{conversation.has_attachments}}

  2. Custom Action: "classify_email"
     URL: https://tu-dominio.com/api/fin/classify-and-route
     Method: POST
     Headers:
       Authorization: Bearer {{secrets.API_TOKEN}}
     Body:
       {
         "from": "{{email_from}}",
         "subject": "{{email_subject}}",
         "body": "{{email_body}}",
         "thread_id": "{{thread_id}}",
         "has_attachments": {{has_attachments}},
         "attachments": "{{conversation.attachments}}"
       }
     Timeout: 3 seconds
     Save response as: classification_result

  3. Branch on classification_result.action:

     Case "CONTINUE_WITH_FIN":
       - Set conversation custom_attributes:
           routing_decision: "customer_inquiry"
           customer_context: {{classification_result.context}}
       - Continue to next workflow (Quotation Handler)

     Case "CLOSE_AND_PROCESS_EXTERNALLY":
       - Send message: "{{classification_result.automated_reply}}"
       - Close conversation
       - Add tag: "provider-response"
       - Add tag: "auto-processed"
       - Call webhook: /api/providers/process-response
           {
             "conversation_id": "{{thread_id}}",
             "email_data": {...},
             "metadata": {{classification_result.metadata}}
           }

     Case "ESCALATE_TO_HUMAN":
       - Send message: "{{classification_result.escalation_message}}"
       - Assign to team: "Human Review"
       - Add tag: "needs-human-attention"
       - Set priority: HIGH

     Case "IGNORE":
       - Close conversation silently
       - Add tag: "spam-or-out-of-scope"
```

### Workflow 2: Quotation Handler (Solo si CONTINUE_WITH_FIN)

```yaml
Name: "Quotation Data Collection"
Trigger: "When conversation has tag 'customer_inquiry'"

Steps:
  1. Initial Analysis:
     - Analyze attachments (PDFs, DXF, etc)
     - Extract visible data from email

  2. Custom Action: "analyze_technical_requirements"
     URL: /api/fin/analyze-technical-data
     Body:
       {
         "email_body": "{{email_body}}",
         "attachments": "{{attachments}}"
       }
     Save as: technical_analysis

  3. Determine missing data:
     Required fields:
       - material (specific grade)
       - quantity
       - surface_finish
       - tolerances (or default to standard)
       - deadline

     If technical_analysis.completeness < 80%:
       - Ask for missing fields conversationally
       - Wait for user response
       - Loop until completeness >= 80%

  4. Confirm with customer:
     Send message: "Perfecto, confirmo que entendí:
       ✅ Material: {{technical_analysis.material}}
       ✅ Cantidad: {{technical_analysis.quantity}}
       ✅ Acabado: {{technical_analysis.surface_finish}}
       ¿Es correcto?"

  5. Custom Action: "check_internal_capacity"
     URL: /api/fin/check-capacity
     Body:
       {
         "material": "{{technical_analysis.material}}",
         "quantity": "{{technical_analysis.quantity}}",
         "deadline": "{{technical_analysis.deadline}}"
       }
     Save as: capacity_check

  6. Inform customer:
     If capacity_check.can_manufacture_internally = true:
       "Podemos fabricar estas piezas internamente.
        Plazo estimado: {{capacity_check.estimated_days}} días."

     If capacity_check.needs_external_services:
       "Para el {{capacity_check.external_service}} necesitamos
        consultar con proveedores especializados.
        Te contactaremos con presupuesto completo en 2-3 días."

  7. Custom Action: "create_quotation_request"
     URL: /api/fin/quotation-complete
     Body:
       {
         "customer_email": "{{email_from}}",
         "customer_name": "{{conversation.user.name}}",
         "quotation_data": {{technical_analysis}},
         "internal_capacity": {{capacity_check}},
         "conversation_id": "{{thread_id}}"
       }
     Save as: quotation_created

  8. Final confirmation:
     "Tu solicitud #{{quotation_created.quotation_id}} está registrada.
      Recibirás presupuesto detallado en tu email en máximo 48 horas.

      ¿Hay algo más que deba saber sobre este proyecto?"

  9. Close conversation when customer confirms
```

---

## 🔌 API Endpoints a Implementar

### 1. POST /api/fin/classify-and-route

**Propósito:** Clasificar email y decidir routing ANTES de que Fin responda

```typescript
// app/api/fin/classify-and-route/route.ts

export async function POST(req: Request) {
  const { from, subject, body, thread_id, has_attachments } = await req.json();

  // PASO 1: Check if provider (DB lookup - debe ser < 500ms)
  const provider = await db.provider_contacts.findUnique({
    where: { email: from },
    select: { id: true, company_name: true }
  });

  if (provider) {
    // Es un proveedor respondiendo
    const rfq = await findRelatedRFQ(from, subject);

    return Response.json({
      routing_decision: "PROVIDER_RESPONSE",
      action: "CLOSE_AND_PROCESS_EXTERNALLY",
      automated_reply: `Hola, gracias por tu cotización. La estamos procesando y te contactaremos si necesitamos aclaraciones. Saludos, Equipo Arkcutt`,
      metadata: {
        provider_id: provider.id,
        provider_name: provider.company_name,
        rfq_id: rfq?.id
      }
    });
  }

  // PASO 2: Check if existing customer thread
  const existingQuotation = await db.quotation_requests.findFirst({
    where: {
      OR: [
        { conversation_thread_id: thread_id },
        { customer_email: from }
      ]
    },
    orderBy: { created_at: 'desc' }
  });

  if (existingQuotation) {
    return Response.json({
      routing_decision: "CUSTOMER_FOLLOWUP",
      action: "CONTINUE_WITH_FIN",
      context: {
        existing_customer: true,
        previous_quotation_id: existingQuotation.id,
        customer_history: await getCustomerHistory(from)
      }
    });
  }

  // PASO 3: Check spam/out-of-scope (fast keyword check)
  const text = (subject + ' ' + body).toLowerCase();
  const spamKeywords = ['nómina', 'factura', 'pago', 'invoice'];
  const isOutOfScope = spamKeywords.some(kw => text.includes(kw));

  if (isOutOfScope) {
    return Response.json({
      routing_decision: "OUT_OF_SCOPE",
      action: "IGNORE",
      reason: "administrative_email"
    });
  }

  // PASO 4: Check if looks like quotation request
  const quotationKeywords = ['presupuesto', 'cotización', 'mecanizar', 'piezas'];
  const hasQuotationIntent = quotationKeywords.some(kw => text.includes(kw)) || has_attachments;

  if (hasQuotationIntent) {
    return Response.json({
      routing_decision: "CUSTOMER_INQUIRY",
      action: "CONTINUE_WITH_FIN",
      context: {
        new_customer: true,
        has_technical_attachments: has_attachments,
        detected_intent: "quotation_request"
      }
    });
  }

  // PASO 5: Uncertain - escalate to human
  return Response.json({
    routing_decision: "UNCERTAIN",
    action: "ESCALATE_TO_HUMAN",
    escalation_message: "Gracias por contactarnos. Un miembro de nuestro equipo te responderá en breve.",
    reason: "no_clear_intent"
  });
}
```

**Performance:** < 1 segundo (crítico para no bloquear Fin)

---

### 2. POST /api/fin/quotation-complete

**Propósito:** Crear quotation request y iniciar búsqueda de proveedores si es necesario

```typescript
// app/api/fin/quotation-complete/route.ts

export async function POST(req: Request) {
  const {
    customer_email,
    customer_name,
    quotation_data,
    internal_capacity,
    conversation_id
  } = await req.json();

  // Crear quotation request
  const quotation = await db.quotation_requests.create({
    data: {
      customer_email,
      conversation_thread_id: conversation_id,
      datos_contacto: {
        nombre: customer_name,
        email: customer_email
      },
      datos_tecnicos: quotation_data,
      internal_services: internal_capacity.internal_services || [],
      external_services: internal_capacity.external_services || [],
      status: internal_capacity.needs_external_services
        ? 'waiting_providers'
        : 'ready_for_human',
      source: 'fin_intercom'
    }
  });

  // Si necesita servicios externos, buscar proveedores
  if (internal_capacity.needs_external_services) {
    await searchAndContactProviders(
      quotation.id,
      internal_capacity.external_services
    );
  }

  return Response.json({
    success: true,
    quotation_id: quotation.id,
    status: quotation.status
  });
}

async function searchAndContactProviders(
  quotationId: string,
  externalServices: string[]
) {
  for (const service of externalServices) {
    // Buscar proveedores (DB + Google Places)
    const providers = await searchProviders(service);

    // Enviar RFQs a top 3
    for (const provider of providers.slice(0, 3)) {
      await sendRFQToProvider(provider, {
        quotation_request_id: quotationId,
        service_type: service
      });
    }
  }
}
```

---

### 3. POST /api/fin/check-capacity (Custom Action)

**Propósito:** Consultar disponibilidad interna (ERP, inventario, calendario)

```typescript
// app/api/fin/check-capacity/route.ts

export async function POST(req: Request) {
  const { material, quantity, deadline } = await req.json();

  // Consultar inventario (futuro: ERP real)
  const stockAvailable = await checkMaterialStock(material, quantity);

  // Consultar calendario de producción
  const productionSlots = await checkProductionCapacity(quantity, deadline);

  // Determinar qué servicios necesita
  const services = await analyzeRequiredServices({
    material,
    quantity,
    // ... otros datos
  });

  const needsExternal = services.external.length > 0;

  return Response.json({
    can_manufacture_internally: stockAvailable && productionSlots.available,
    stock_available: stockAvailable,
    estimated_days: productionSlots.estimated_days,
    needs_external_services: needsExternal,
    external_services: services.external, // ["anodizado", "tratamiento_termico"]
    internal_services: services.internal, // ["mecanizado_cnc", "fresado"]
    confidence: 0.9
  });
}
```

---

### 4. POST /api/providers/process-response (Webhook)

**Propósito:** Procesar respuesta de proveedor que fue cerrada por Fin

```typescript
// app/api/providers/process-response/route.ts

import { ProvidersAgentOSS } from '@/lib/agents/providers-agent-oss';

const agent = new ProvidersAgentOSS();

export async function POST(req: Request) {
  const { conversation_id, email_data, metadata } = await req.json();

  // Construir email object
  const email = {
    id: conversation_id,
    from: email_data.from,
    subject: email_data.subject,
    body: email_data.body,
    threadId: conversation_id
  };

  // Procesar con Providers Agent OSS
  const result = await agent.processProviderResponse(email);

  return Response.json({
    success: true,
    rfq_id: result.rfq_id,
    quote_extracted: result.quote_data
  });
}
```

---

## 🎯 Ventajas de Esta Arquitectura

### 1. **Un Solo Email**
- Todo llega a ventas@arkcutt.com
- No necesitas educar a nadie sobre múltiples emails
- Simple para el cliente

### 2. **Control Total desde Tus APIs**
- Fin llama a tus endpoints
- Tú decides qué hacer con cada email
- Puedes cambiar lógica sin tocar Fin

### 3. **Sin Race Conditions**
- Fin ESPERA respuesta de tu API antes de actuar
- Timeout de 3 segundos (configurable)
- Si tu API falla, Fin escala a humano automáticamente

### 4. **Tiempo Real**
- Clientes reciben respuesta en 5-10 segundos
- Proveedores se procesan inmediatamente (sin esperar cron)
- Todo asíncrono

### 5. **Fácil Testing**
- Puedes testear endpoints independientemente
- Mock responses para desarrollar workflows de Fin
- A/B testing cambiando solo respuestas de API

### 6. **Escalable**
- Añadir nueva lógica = añadir código en API
- No tocar configuración de Fin
- Feature flags en tu backend

---

## 📋 Plan de Implementación Actualizado

### FASE 1: Backend APIs (1 semana)

**1.1. Crear endpoints básicos**
```bash
/api/fin/classify-and-route  ← CRÍTICO (< 1 seg response)
/api/fin/quotation-complete
/api/providers/process-response
```

**1.2. Providers Agent OSS**
- Implementar con Together AI + Qwen 2.5
- Extracción de cotizaciones
- Evaluación de competitividad

**1.3. Testing local**
- Mock requests de Fin
- Verificar tiempos de respuesta
- Tests unitarios

---

### FASE 2: Setup Intercom + Fin (3 días)

**2.1. Conectar email**
- ventas@arkcutt.com → Intercom (IMAP)

**2.2. Activar Fin**
- Trial 30 días
- Configuración básica

**2.3. Crear secretos**
```
Intercom → Settings → Developer Hub → Secrets
- API_TOKEN: [tu token para autenticar Custom Actions]
```

---

### FASE 3: Crear Workflows en Fin (2 días)

**3.1. Workflow: Email Router**
```
Intercom → Fin → Workflows → Create
- Name: "Email Router"
- Trigger: conversation.created
- Custom Action → /api/fin/classify-and-route
- Branches según response.action
```

**3.2. Workflow: Quotation Handler**
```
- Name: "Quotation Data Collection"
- Trigger: conversation tagged "customer_inquiry"
- Multiple Custom Actions para validación
- Final action → /api/fin/quotation-complete
```

---

### FASE 4: Entrenamiento Fin (1 semana)

**4.1. Content Sources**
- Subir documentación servicios
- FAQs
- Materiales database

**4.2. Conversaciones ejemplo**
- 20-30 ejemplos de casos reales
- Cubrir: simple, complejo, missing data, etc.

**4.3. Tono y personalidad**
- Profesional, técnico, cordial
- Español España
- Uso mínimo de emojis

---

### FASE 5: Testing Integrado (1 semana)

**5.1. Test cliente nuevo**
- Enviar email a ventas@
- Verificar Fin responde
- Verificar datos llegan a DB

**5.2. Test proveedor**
- Enviar RFQ
- Proveedor responde
- Verificar Fin cierra conversación
- Verificar Providers Agent procesa

**5.3. Test casos edge**
- Spam
- Email ambiguo
- Proveedor nuevo (no en DB)

---

### FASE 6: Piloto (2 semanas)

**6.1. Activar para 10% tráfico**
- Feature flag en clasificación
- 90% → sistema legacy
- 10% → Fin

**6.2. Monitoreo intensivo**
- Métricas de clasificación
- Tiempos de respuesta API
- Satisfacción cliente

**6.3. Ajustes**
- Refinar prompts de Fin
- Optimizar APIs
- Ajustar thresholds

---

### FASE 7: Rollout Completo (1 semana)

**7.1. Aumentar gradualmente**
- 10% → 50% → 100%

**7.2. Deprecar código legacy**
- Mantener como fallback 1 mes
- Eliminar después

---

## ⚡ Consideraciones de Performance

### APIs deben ser RÁPIDAS

```typescript
// CRÍTICO: classify-and-route debe responder en < 1 segundo

// ✅ BUENO: DB lookup con índices
const provider = await db.provider_contacts.findUnique({
  where: { email: from }, // indexed
  select: { id: true } // solo lo necesario
});

// ❌ MALO: Consultas pesadas
const provider = await db.provider_contacts.findMany({
  where: {
    email: {
      contains: from // scan completo, lento
    }
  },
  include: {
    quotations: { include: { ... } } // demasiada data
  }
});
```

### Timeouts en Fin

```yaml
# Configurar timeout en Custom Action
Timeout: 3 seconds

Fallback if timeout:
  - Escalate to human
  - Log error
  - Send notification to dev team
```

### Caching

```typescript
// Cache proveedores en memoria (actualizar cada 1h)
const providerEmailsCache = new Map<string, boolean>();

async function isProvider(email: string): Promise<boolean> {
  if (providerEmailsCache.has(email)) {
    return providerEmailsCache.get(email)!;
  }

  const provider = await db.provider_contacts.findUnique({
    where: { email }
  });

  const isProviderEmail = !!provider;
  providerEmailsCache.set(email, isProviderEmail);

  return isProviderEmail;
}
```

---

## 🔒 Seguridad

### Autenticar Custom Actions

```typescript
// app/api/fin/classify-and-route/route.ts

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== process.env.FIN_API_TOKEN) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ... resto del código
}
```

### Validar input de Fin

```typescript
import { z } from 'zod';

const ClassifyRequestSchema = z.object({
  from: z.string().email(),
  subject: z.string(),
  body: z.string(),
  thread_id: z.string(),
  has_attachments: z.boolean()
});

export async function POST(req: Request) {
  const rawData = await req.json();

  // Validar
  const data = ClassifyRequestSchema.parse(rawData);

  // ... procesar
}
```

---

## 📊 Monitoreo

### Logging de Custom Actions

```typescript
// Cada API endpoint debe loguear

await db.fin_api_logs.create({
  data: {
    endpoint: '/api/fin/classify-and-route',
    request: { from, subject },
    response: { routing_decision, action },
    response_time_ms: Date.now() - startTime,
    timestamp: new Date()
  }
});
```

### Métricas clave

```typescript
interface FinMetrics {
  avg_classify_time_ms: number; // debe ser < 500ms
  classify_success_rate: number; // % sin errores
  customer_resolution_rate: number; // % Fin resuelve sin humano
  provider_detection_accuracy: number; // % correctamente identificados
}
```

---

## 🎬 Próximos Pasos

1. **Aprobar esta arquitectura** ✅
2. **Crear APIs básicas** (classify-and-route primero)
3. **Setup Intercom trial**
4. **Crear primer workflow** (Email Router)
5. **Testing básico**
6. **Iterar y mejorar**

¿Empezamos por crear los endpoints de API?
