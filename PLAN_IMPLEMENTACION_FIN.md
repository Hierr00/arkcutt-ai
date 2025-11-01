# 🎯 PLAN DE IMPLEMENTACIÓN: INTEGRACIÓN FIN DE INTERCOM
## Proyecto Arkcutt AI - Arquitectura Híbrida

**Versión:** 1.0
**Fecha:** 2025-11-01
**Branch:** `feat/fin-intercom-integration`
**Duración estimada:** 10-12 semanas
**Esfuerzo:** 220 horas desarrollo

---

## 📋 ÍNDICE

1. [Preocupaciones y Soluciones](#1-preocupaciones-y-soluciones)
2. [Arquitectura Híbrida Propuesta](#2-arquitectura-híbrida-propuesta)
3. [Estrategia de Diferenciación de Emails](#3-estrategia-de-diferenciación-de-emails)
4. [Plan de Implementación (12 Fases)](#4-plan-de-implementación-12-fases)
5. [Guía Completa de Entrenamiento de Fin](#5-guía-completa-de-entrenamiento-de-fin)
6. [Migración de Código Existente](#6-migración-de-código-existente)
7. [Plan de Testing](#7-plan-de-testing)
8. [Plan de Rollback](#8-plan-de-rollback)
9. [Monitoreo y Métricas](#9-monitoreo-y-métricas)
10. [Estimación de Costes](#10-estimación-de-costes)

---

## 1. PREOCUPACIONES Y SOLUCIONES

### 🚨 Preocupación #1: Pérdida del trabajo anterior

**Riesgo:** Migrar a Fin y perder código/funcionalidad valiosa.

**Solución:**
```bash
# Branch strategy
feat/fin-intercom-integration ← desarrollo activo
master ← producción actual (intacta)
backup/pre-fin ← snapshot completo antes de merge
```

**Estrategia de preservación:**
- ✅ **Mantener en paralelo** ambos sistemas durante 4 semanas
- ✅ **Feature flag** para activar/desactivar Fin por cliente
- ✅ **Rollback automático** si métricas caen >20%
- ✅ **Backup completo** de DB antes de cada fase

---

### 🚨 Preocupación #2: Un solo email para todo (pedidos + presupuestos + otros)

**Riesgo:** Fin procesa emails que no debería (RRHH, facturas, soporte, etc.)

**Solución: Sistema de Routing Inteligente Pre-Fin**

```typescript
// NUEVO: lib/routing/email-router.ts

interface EmailRoute {
  destination: 'FIN' | 'PROVIDERS_AGENT' | 'HUMAN' | 'IGNORE';
  confidence: number;
  reason: string;
}

class EmailRouter {
  async route(email: Email): Promise<EmailRoute> {
    // CAPA 1: Reglas determinísticas (100% confianza)
    const deterministicRoute = this.applyDeterministicRules(email);
    if (deterministicRoute) return deterministicRoute;

    // CAPA 2: Clasificador ML ligero (open source)
    const mlRoute = await this.applyMLClassifier(email);
    if (mlRoute.confidence > 0.85) return mlRoute;

    // CAPA 3: Escalación humana
    return { destination: 'HUMAN', confidence: mlRoute.confidence, reason: 'low_confidence' };
  }

  private applyDeterministicRules(email: Email): EmailRoute | null {
    // Regla 1: Adjuntos técnicos → FIN
    if (this.hasTechnicalAttachments(email)) {
      return { destination: 'FIN', confidence: 1.0, reason: 'technical_attachments' };
    }

    // Regla 2: Keywords específicos → FIN
    const quotationKeywords = ['presupuesto', 'cotización', 'mecanizar', 'piezas', 'rfq'];
    if (this.containsKeywords(email, quotationKeywords, 2)) {
      return { destination: 'FIN', confidence: 1.0, reason: 'quotation_keywords' };
    }

    // Regla 3: Proveedores conocidos respondiendo → PROVIDERS_AGENT
    if (this.isProviderResponse(email)) {
      return { destination: 'PROVIDERS_AGENT', confidence: 1.0, reason: 'provider_response' };
    }

    // Regla 4: Blacklist (RRHH, legal, facturas)
    const blacklistKeywords = ['nómina', 'contrato', 'despido', 'factura', 'pago'];
    if (this.containsKeywords(email, blacklistKeywords, 1)) {
      return { destination: 'IGNORE', confidence: 1.0, reason: 'out_of_scope' };
    }

    // Regla 5: Remitente conocido (cliente existente)
    if (this.isExistingCustomer(email.from)) {
      return { destination: 'FIN', confidence: 0.9, reason: 'known_customer' };
    }

    return null; // Continuar a ML
  }

  private async applyMLClassifier(email: Email): Promise<EmailRoute> {
    // Usar modelo open source (ver sección modelo providers)
    const classification = await this.onnxModel.classify(email.subject + ' ' + email.body);

    return {
      destination: classification.category as EmailRoute['destination'],
      confidence: classification.score,
      reason: 'ml_classifier'
    };
  }
}
```

**Estrategia de etiquetas Gmail:**
```javascript
// Organización automática
const labels = {
  'Arkcutt/Pedidos': 'FIN procesa',
  'Arkcutt/Proveedores': 'Agente custom procesa',
  'Arkcutt/Otros': 'Humano revisa',
  'Arkcutt/Spam': 'Ignora'
};
```

**Configuración Intercom Inbox:**
```javascript
// Intercom ruleset
{
  "routing_rules": [
    {
      "if": "subject contains 'presupuesto' OR has_attachment:pdf",
      "then": "assign_to_fin"
    },
    {
      "if": "from_domain in [lista_proveedores]",
      "then": "route_to_webhook:providers-agent"
    },
    {
      "if": "confidence < 0.8",
      "then": "assign_to_human_team"
    }
  ]
}
```

---

### 🚨 Preocupación #3: Coste escalable con volumen de cliente

**Riesgo:** Cliente grande = $1000+/mes en Fin = producto caro.

**Solución: Pricing Tiered + Modelo Híbrido**

```javascript
// Estrategia de pricing por volumen
const pricingStrategy = {
  // Clientes pequeños: Todo Fin (simplicidad)
  small: {
    emails_per_month: '< 200',
    fin_cost: '$200/mes',
    your_price: '$299/mes',
    margin: '$99/mes (33%)'
  },

  // Clientes medianos: Híbrido (Fin + Open Source)
  medium: {
    emails_per_month: '200-1000',
    fin_cost: '$400/mes',
    open_source_cost: '$50/mes (hosting)',
    your_price: '$599/mes',
    margin: '$149/mes (25%)'
  },

  // Clientes enterprise: Mayormente Open Source
  enterprise: {
    emails_per_month: '> 1000',
    fin_cost: '$200/mes (solo casos complejos)',
    open_source_cost: '$150/mes (GPU hosting)',
    your_price: '$999/mes',
    margin: '$649/mes (65%)'
  }
};
```

**Feature flag por cliente:**
```typescript
// lib/config/client-routing.ts
interface ClientConfig {
  client_id: string;
  routing_strategy: 'fin_only' | 'hybrid' | 'open_source_only';
  fin_confidence_threshold: number; // 0.7 = menos uso de Fin
  max_fin_resolutions_per_month: number; // Cap de coste
}

// Ejemplo
const clientConfigs = [
  {
    client_id: 'empresa_pequeña_SA',
    routing_strategy: 'fin_only', // Simplicidad
    fin_confidence_threshold: 0.5,
    max_fin_resolutions_per_month: 300
  },
  {
    client_id: 'industrias_grandes_Corp',
    routing_strategy: 'hybrid', // Optimización coste
    fin_confidence_threshold: 0.85, // Solo casos difíciles
    max_fin_resolutions_per_month: 100
  }
];
```

---

### 🚨 Preocupación #4: Diferenciación mails de clientes vs proveedores

**Riesgo:** Fin responde a un proveedor como si fuera cliente.

**Solución: Sistema de Contexto Previo**

```typescript
// NUEVO: lib/context/email-context-builder.ts

class EmailContextBuilder {
  async buildContext(email: Email): Promise<EmailContext> {
    const context: EmailContext = {
      type: 'unknown',
      relatedEntities: [],
      conversationHistory: [],
      metadata: {}
    };

    // 1. Buscar en DB de proveedores
    const provider = await db.provider_contacts.findUnique({
      where: { email: email.from }
    });

    if (provider) {
      context.type = 'PROVIDER_RESPONSE';
      context.relatedEntities.push({
        type: 'provider',
        id: provider.id,
        name: provider.company_name
      });

      // Buscar RFQ original
      const relatedRFQ = await db.external_quotations.findFirst({
        where: {
          provider_email: email.from,
          status: { in: ['sent', 'pending'] }
        },
        orderBy: { created_at: 'desc' }
      });

      if (relatedRFQ) {
        context.metadata.rfq_id = relatedRFQ.id;
        context.metadata.original_request_id = relatedRFQ.quotation_request_id;
      }

      return context; // NO enviar a Fin, enviar a Providers Agent
    }

    // 2. Buscar en DB de clientes
    const customer = await db.quotation_requests.findFirst({
      where: {
        OR: [
          { datos_contacto: { path: ['email'], equals: email.from } },
          { customer_email: email.from }
        ]
      }
    });

    if (customer) {
      context.type = 'CUSTOMER_FOLLOWUP';
      context.relatedEntities.push({
        type: 'customer',
        id: customer.id,
        name: customer.datos_contacto?.['nombre']
      });
      context.conversationHistory = await this.getConversationHistory(customer.conversation_thread_id);

      return context; // ENVIAR a Fin con contexto
    }

    // 3. Nuevo contacto
    context.type = 'NEW_INQUIRY';
    return context; // ENVIAR a Fin
  }
}
```

**Webhook routing en Intercom:**
```javascript
// Antes de que Fin procese, ejecutar webhook
POST /api/intercom/pre-process
{
  "email": {...},
  "action": "determine_routing"
}

// Respuesta determina si Fin procesa o no
{
  "route_to_fin": false,
  "route_to": "providers_agent",
  "reason": "email_from_known_provider"
}
```

---

### 🚨 Preocupación #5: Modelo custom vs Open Source para proveedores

**Recomendación: Open Source para Providers Agent**

**Por qué:**
- ✅ Menor coste (self-hosted)
- ✅ Control total
- ✅ No hay rate limits
- ✅ Privacidad de datos de proveedores

**Stack tecnológico:**

```yaml
# Opción 1: LLaMA 3.1 8B (recomendada)
model: meta-llama/Llama-3.1-8B-Instruct
hosting: Modal Labs / RunPod
cost: $0.10/1M tokens (~$30/mes)
latency: 500ms
quality: 90% de GPT-4o-mini

# Opción 2: Mistral 7B
model: mistralai/Mistral-7B-Instruct-v0.2
hosting: HuggingFace Inference Endpoints
cost: $60/mes (dedicado)
latency: 300ms
quality: 85% de GPT-4o-mini

# Opción 3: Qwen 2.5 7B (best value)
model: Qwen/Qwen2.5-7B-Instruct
hosting: Together AI
cost: $0.20/1M tokens (~$20/mes)
latency: 400ms
quality: 92% de GPT-4o-mini ← RECOMENDADO
```

**Implementación:**

```typescript
// NUEVO: lib/agents/providers-agent-oss.ts

import { OpenAI } from 'openai'; // Compatible con APIs open source

class ProvidersAgentOSS {
  private client: OpenAI;

  constructor() {
    // Together AI (compatible con API OpenAI)
    this.client = new OpenAI({
      apiKey: process.env.TOGETHER_AI_API_KEY,
      baseURL: 'https://api.together.xyz/v1'
    });
  }

  async processProviderResponse(email: Email, rfqContext: RFQContext) {
    const prompt = `Eres un asistente especializado en analizar respuestas de proveedores.

CONTEXTO:
- RFQ enviado: ${rfqContext.service_type} para ${rfqContext.material}
- Proveedor: ${rfqContext.provider_name}
- Email recibido: ${email.body}

TAREAS:
1. Extraer precio cotizado (€ o $)
2. Extraer plazo de entrega (días)
3. Extraer condiciones especiales
4. Evaluar competitividad (1-10)
5. Detectar si necesita aclaración

Responde en JSON:
{
  "precio": number,
  "moneda": "EUR" | "USD",
  "plazo_dias": number,
  "condiciones": string[],
  "competitividad": number,
  "necesita_aclaracion": boolean,
  "preguntas_aclaracion": string[]
}`;

    const completion = await this.client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  async generateFollowUpEmail(providerData: any, questions: string[]) {
    const prompt = `Genera un email profesional de seguimiento a ${providerData.name}.

PREGUNTAS A ACLARAR:
${questions.map((q, i) => `${i+1}. ${q}`).join('\n')}

TONO: Profesional, cordial, conciso.
IDIOMA: Español
FORMATO: HTML para email`;

    const completion = await this.client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    return completion.choices[0].message.content;
  }
}
```

---

## 2. ARQUITECTURA HÍBRIDA PROPUESTA

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GMAIL INBOX                                 │
│                    ventas@arkcutt.com                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   EMAIL ROUTER (Nuevo)                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. Reglas determinísticas                                    │   │
│  │ 2. Clasificador ML (ONNX)                                    │   │
│  │ 3. Context Builder (DB lookup)                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────┬──────────────────────┬──────────────────────┬────────────────┘
       │                      │                      │
       ↓                      ↓                      ↓
┌──────────────┐    ┌─────────────────┐    ┌───────────────────┐
│ FIN INTERCOM │    │ PROVIDERS AGENT │    │ HUMAN ESCALATION  │
│              │    │  (Open Source)  │    │                   │
│ • Clientes   │    │ • Proveedores   │    │ • Casos complejos │
│ • Pedidos    │    │ • RFQ responses │    │ • Baja confianza  │
│ • Dudas      │    │ • Follow-ups    │    │                   │
└──────┬───────┘    └────────┬────────┘    └───────────────────┘
       │                     │
       │                     │
       ↓                     ↓
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                         │
│  • quotation_requests                                        │
│  • external_quotations                                       │
│  • provider_contacts                                         │
│  • routing_logs (nuevo)                                      │
└──────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────┐
│              DASHBOARD (Next.js)                             │
│  • Vista unificada de todos los canales                      │
│  • Métricas de routing                                       │
│  • Comparación Fin vs OSS                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. ESTRATEGIA DE DIFERENCIACIÓN DE EMAILS

### Tabla de Decisión

| **Tipo de Email** | **Indicadores** | **Destino** | **Confianza** |
|-------------------|----------------|-------------|---------------|
| **Pedido nuevo** | Keywords: presupuesto, cotización<br>Adjuntos: PDF, DXF, STEP<br>Remitente: Nuevo o cliente | **FIN** | 95% |
| **Seguimiento cliente** | Thread existente en quotation_requests<br>From: email conocido cliente | **FIN** | 100% |
| **Respuesta proveedor** | From: email en provider_contacts<br>Subject: Re: RFQ-{id}<br>Referencias a cotización enviada | **PROVIDERS AGENT** | 100% |
| **Consulta general** | Keywords: información, catálogo, servicios<br>Sin adjuntos técnicos | **FIN** | 70% |
| **Factura/Pago** | Keywords: factura, pago, transferencia<br>Adjuntos: PDF factura | **HUMAN** | 100% |
| **RRHH/Legal** | Keywords: contrato, nómina, despido<br>From: dominios internos | **IGNORE** | 100% |
| **Spam** | Regex patrones spam<br>Múltiples links externos | **IGNORE** | 90% |
| **Incierto** | Confidence < 80% | **HUMAN** | <80% |

### Algoritmo de Clasificación

```python
# Pseudocódigo del algoritmo

def classify_email(email):
    score = {
        'CUSTOMER_QUOTATION': 0,
        'PROVIDER_RESPONSE': 0,
        'GENERAL_INQUIRY': 0,
        'ADMIN': 0,
        'SPAM': 0
    }

    # 1. Búsqueda exacta en DB
    if email.from in provider_contacts.emails:
        return 'PROVIDER_RESPONSE', 1.0

    if email.thread_id in quotation_requests.thread_ids:
        return 'CUSTOMER_QUOTATION', 1.0

    # 2. Análisis de adjuntos
    if has_technical_attachments(email):
        score['CUSTOMER_QUOTATION'] += 0.4

    # 3. Análisis de keywords
    quotation_keywords = ['presupuesto', 'cotización', 'precio', 'mecanizar', 'piezas']
    provider_keywords = ['cotización adjunta', 'nuestro precio', 'plazo entrega']
    spam_keywords = ['click aquí', 'oferta limitada', 'ganador']

    score['CUSTOMER_QUOTATION'] += count_keywords(email, quotation_keywords) * 0.15
    score['PROVIDER_RESPONSE'] += count_keywords(email, provider_keywords) * 0.15
    score['SPAM'] += count_keywords(email, spam_keywords) * 0.3

    # 4. Análisis de asunto
    if email.subject.startswith('Re: RFQ-'):
        return 'PROVIDER_RESPONSE', 0.95

    # 5. ML fallback
    if max(score.values()) < 0.7:
        ml_result = onnx_classifier.predict(email.body)
        return ml_result.category, ml_result.confidence

    # 6. Decisión final
    category = max(score, key=score.get)
    confidence = score[category]

    if confidence >= 0.8:
        return category, confidence
    else:
        return 'HUMAN_REVIEW', confidence
```

---

## 4. PLAN DE IMPLEMENTACIÓN (12 FASES)

### FASE 0: Preparación (Semana 0)
**Duración:** 3 días
**Esfuerzo:** 12 horas

#### Tareas:
- [x] Crear branch `feat/fin-intercom-integration`
- [ ] Backup completo de DB producción
- [ ] Documentar estado actual (métricas baseline)
- [ ] Setup entorno de staging
- [ ] Crear trial Intercom (30 días)

#### Entregables:
```bash
# Script de backup
./scripts/backup-production.sh
# Output: backup-2025-11-01.sql (con timestamp)

# Documentación baseline
docs/metrics-baseline-2025-11-01.md
- Emails procesados/día: X
- Tasa de éxito clasificación: Y%
- Tiempo promedio respuesta: Z min
```

#### Criterios de éxito:
- ✅ Backup verificado y restaurable
- ✅ Cuenta Intercom activa
- ✅ Staging environment funcional

---

### FASE 1: Setup Intercom + Fin (Semana 1)
**Duración:** 5 días
**Esfuerzo:** 24 horas

#### Día 1-2: Configuración Inicial Intercom

**1.1. Crear Workspace Intercom**
```javascript
// Configuración inicial
Workspace: "Arkcutt AI"
Region: EU (GDPR compliance)
Industry: Manufacturing / B2B
Language: Spanish (primary), English (secondary)
```

**1.2. Integrar dominio de email**
```bash
# DNS Records a configurar
MX    @ mail.intercom.io   Priority: 10
TXT   @ "v=spf1 include:_spf.intercom.io ~all"
CNAME intercom._domainkey  intercom._domainkey.intercom.io
```

**1.3. Configurar Gmail forwarding**
```javascript
// Opción A: Forward directo (más simple)
Gmail Settings → Forwarding → ventas@arkcutt.com forwards to {intercom-email}

// Opción B: IMAP sync (más control)
Intercom → Settings → Email → Connect Gmail via IMAP
Username: ventas@arkcutt.com
Password: [App Password]
```

#### Día 3-4: Activar y Configurar Fin

**1.4. Activar Fin AI**
```
Intercom → Fin → Activate
Plan: Start with trial (30 días)
```

**1.5. Configuración básica Fin**
```yaml
# Settings → Fin → General
name: "Asistente Arkcutt"
role: "Especialista en presupuestos industriales"
tone: "Profesional, técnico, cordial"
language: "Español (España)"
fallback_behavior: "Transfer to human after 2 failed attempts"
confidence_threshold: 0.7  # Ajustable luego
```

**1.6. Configurar horario y disponibilidad**
```yaml
# Fin availability
business_hours:
  monday_friday: "08:00-18:00 CET"
  saturday: "Closed"
  sunday: "Closed"

out_of_hours_message: |
  Gracias por contactarnos. Nuestro horario es L-V 08:00-18:00.
  Hemos recibido tu solicitud y te responderemos en cuanto abramos.
```

#### Día 5: Testing Inicial

**1.7. Prueba de concepto**
- Enviar 5 emails de prueba a ventas@arkcutt.com
- Verificar recepción en Intercom
- Verificar respuestas automáticas de Fin
- Documentar problemas

#### Entregables:
```
docs/intercom-setup.md
  - Credenciales acceso
  - Configuración DNS
  - Settings de Fin

logs/fin-initial-tests.md
  - 5 conversaciones de prueba
  - Análisis de respuestas
  - Issues detectados
```

#### Criterios de éxito:
- ✅ Emails llegan a Intercom Inbox
- ✅ Fin responde automáticamente
- ✅ Respuestas son coherentes (aunque no perfectas)

---

### FASE 2: Entrenamiento Básico de Fin (Semana 1-2)
**Duración:** 7 días
**Esfuerzo:** 32 horas

**Ver sección 5 (Guía Completa de Entrenamiento) para detalles exhaustivos**

#### Quick overview:
- Configurar "Conocimiento" (content sources)
- Crear 20 conversaciones de ejemplo
- Definir workflows básicos
- Configurar custom actions (webhooks a vuestro backend)

---

### FASE 3: Desarrollo Email Router (Semana 2-3)
**Duración:** 8 días
**Esfuerzo:** 40 horas

#### 3.1. Crear sistema de routing

```typescript
// NUEVO ARCHIVO: lib/routing/email-router.ts
// Ver código completo en sección 1 (Preocupaciones)

// Estructura de carpetas
lib/
  routing/
    email-router.ts          ← Core router
    rules/
      deterministic-rules.ts ← Reglas fijas
      ml-classifier.ts       ← Modelo ONNX
    context/
      context-builder.ts     ← Construye contexto de email
      db-lookup.service.ts   ← Búsquedas en DB
```

#### 3.2. Implementar reglas determinísticas

```typescript
// lib/routing/rules/deterministic-rules.ts

export class DeterministicRules {
  // Regla 1: Attachments técnicos
  hasTechnicalAttachments(email: Email): boolean {
    const technicalExtensions = ['.pdf', '.dxf', '.dwg', '.step', '.stp', '.stl', '.iges'];
    return email.attachments.some(att =>
      technicalExtensions.some(ext => att.filename.toLowerCase().endsWith(ext))
    );
  }

  // Regla 2: Keywords quotation
  isQuotationEmail(email: Email): { match: boolean; score: number } {
    const quotationKeywords = [
      { word: 'presupuesto', weight: 0.3 },
      { word: 'cotización', weight: 0.3 },
      { word: 'cotizacion', weight: 0.3 },
      { word: 'precio', weight: 0.15 },
      { word: 'mecanizar', weight: 0.25 },
      { word: 'fabricar', weight: 0.2 },
      { word: 'piezas', weight: 0.15 },
      { word: 'cantidad', weight: 0.1 },
      { word: 'material', weight: 0.1 },
      { word: 'planos', weight: 0.2 },
      { word: 'especificaciones', weight: 0.15 }
    ];

    const text = (email.subject + ' ' + email.body).toLowerCase();
    let score = 0;

    quotationKeywords.forEach(({ word, weight }) => {
      if (text.includes(word)) score += weight;
    });

    return { match: score >= 0.4, score };
  }

  // Regla 3: Provider response detection
  async isProviderResponse(email: Email): Promise<boolean> {
    // Check DB
    const provider = await db.provider_contacts.findUnique({
      where: { email: email.from }
    });

    if (provider) return true;

    // Check subject patterns
    const providerSubjectPatterns = [
      /^Re: RFQ-\d+/i,
      /cotización.*adjunta/i,
      /nuestro precio/i,
      /plazo.*entrega/i
    ];

    return providerSubjectPatterns.some(pattern => pattern.test(email.subject));
  }

  // Regla 4: Blacklist (out of scope)
  isOutOfScope(email: Email): { isOutOfScope: boolean; reason: string } {
    const blacklistPatterns = [
      { keywords: ['nómina', 'nomina', 'salario'], reason: 'RRHH' },
      { keywords: ['factura', 'pago', 'transferencia'], reason: 'Contabilidad' },
      { keywords: ['contrato', 'despido', 'baja'], reason: 'Legal' },
      { keywords: ['soporte técnico', 'incidencia', 'error'], reason: 'IT Support' },
      { keywords: ['marketing', 'publicidad', 'anuncio'], reason: 'Marketing' }
    ];

    const text = (email.subject + ' ' + email.body).toLowerCase();

    for (const pattern of blacklistPatterns) {
      if (pattern.keywords.some(kw => text.includes(kw))) {
        return { isOutOfScope: true, reason: pattern.reason };
      }
    }

    return { isOutOfScope: false, reason: '' };
  }

  // Regla 5: Spam detection
  isSpam(email: Email): { isSpam: boolean; confidence: number } {
    const spamIndicators = [
      { pattern: /click (here|aquí)/gi, weight: 0.2 },
      { pattern: /oferta limitada/gi, weight: 0.25 },
      { pattern: /ganador/gi, weight: 0.3 },
      { pattern: /felicidades/gi, weight: 0.15 },
      { pattern: /100% gratis/gi, weight: 0.3 },
      { pattern: /(viagra|casino|lottery)/gi, weight: 0.5 }
    ];

    const text = email.subject + ' ' + email.body;
    let spamScore = 0;

    spamIndicators.forEach(({ pattern, weight }) => {
      const matches = text.match(pattern);
      if (matches) spamScore += weight * matches.length;
    });

    // Multiple external links
    const linkCount = (text.match(/https?:\/\//g) || []).length;
    if (linkCount > 5) spamScore += 0.2;

    return {
      isSpam: spamScore > 0.5,
      confidence: Math.min(spamScore, 1.0)
    };
  }
}
```

#### 3.3. Implementar ML Classifier (ONNX)

```typescript
// lib/routing/rules/ml-classifier.ts
import * as ort from 'onnxruntime-node';

export class MLEmailClassifier {
  private session: ort.InferenceSession | null = null;
  private tokenizer: any; // Simple tokenizer

  async initialize() {
    // Cargar modelo pre-entrenado
    // Opción 1: Fine-tune distilbert-base-multilingual-cased
    // Opción 2: Entrenar desde cero con vuestros datos históricos

    this.session = await ort.InferenceSession.create(
      './models/email-classifier.onnx'
    );

    // Tokenizer simple (o usar @xenova/transformers)
    this.tokenizer = await this.loadTokenizer();
  }

  async classify(email: Email): Promise<ClassificationResult> {
    if (!this.session) await this.initialize();

    const text = `${email.subject} [SEP] ${email.body.substring(0, 500)}`;
    const tokens = await this.tokenizer.encode(text, { max_length: 128 });

    const inputTensor = new ort.Tensor('int64', tokens.input_ids, [1, tokens.input_ids.length]);
    const outputs = await this.session.run({ input_ids: inputTensor });

    const logits = outputs.logits.data as Float32Array;
    const probabilities = this.softmax(Array.from(logits));

    const categories = ['CUSTOMER_QUOTATION', 'PROVIDER_RESPONSE', 'GENERAL_INQUIRY', 'ADMIN', 'SPAM'];
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));

    return {
      category: categories[maxIndex],
      confidence: probabilities[maxIndex],
      all_scores: Object.fromEntries(
        categories.map((cat, i) => [cat, probabilities[i]])
      )
    };
  }

  private softmax(arr: number[]): number[] {
    const max = Math.max(...arr);
    const exp = arr.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  }
}
```

**Nota:** Si no quieres entrenar modelo ML al inicio, usa solo reglas determinísticas (suficiente para 90% casos).

#### 3.4. Context Builder

```typescript
// lib/routing/context/context-builder.ts

export class EmailContextBuilder {
  async buildContext(email: Email): Promise<EmailContext> {
    const context: EmailContext = {
      type: 'UNKNOWN',
      relatedEntities: [],
      conversationHistory: [],
      metadata: {},
      routing: {
        destination: null,
        confidence: 0,
        reason: ''
      }
    };

    // 1. Check if provider
    const providerCheck = await this.checkProvider(email);
    if (providerCheck.isProvider) {
      context.type = 'PROVIDER_RESPONSE';
      context.relatedEntities.push(providerCheck.provider);
      context.routing = {
        destination: 'PROVIDERS_AGENT',
        confidence: 1.0,
        reason: 'email_from_known_provider'
      };
      return context;
    }

    // 2. Check if existing customer conversation
    const customerCheck = await this.checkExistingCustomer(email);
    if (customerCheck.isExisting) {
      context.type = 'CUSTOMER_FOLLOWUP';
      context.relatedEntities.push(customerCheck.customer);
      context.conversationHistory = await this.getHistory(customerCheck.threadId);
      context.routing = {
        destination: 'FIN',
        confidence: 1.0,
        reason: 'existing_customer_thread'
      };
      return context;
    }

    // 3. New inquiry
    context.type = 'NEW_INQUIRY';
    return context;
  }

  private async checkProvider(email: Email) {
    const provider = await db.provider_contacts.findUnique({
      where: { email: email.from }
    });

    if (!provider) return { isProvider: false };

    // Find related RFQ
    const rfq = await db.external_quotations.findFirst({
      where: {
        provider_email: email.from,
        status: { in: ['sent', 'pending'] }
      },
      orderBy: { created_at: 'desc' }
    });

    return {
      isProvider: true,
      provider: {
        type: 'provider',
        id: provider.id,
        name: provider.company_name,
        relatedRFQ: rfq?.id
      }
    };
  }

  private async checkExistingCustomer(email: Email) {
    // Check by thread_id (Gmail)
    if (email.threadId) {
      const quotation = await db.quotation_requests.findFirst({
        where: { conversation_thread_id: email.threadId }
      });

      if (quotation) {
        return {
          isExisting: true,
          customer: { type: 'customer', id: quotation.id },
          threadId: email.threadId
        };
      }
    }

    // Check by email address
    const quotation = await db.quotation_requests.findFirst({
      where: {
        OR: [
          { customer_email: email.from },
          { datos_contacto: { path: ['email'], equals: email.from } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    if (quotation) {
      return {
        isExisting: true,
        customer: { type: 'customer', id: quotation.id },
        threadId: quotation.conversation_thread_id
      };
    }

    return { isExisting: false };
  }
}
```

#### 3.5. Router principal

```typescript
// lib/routing/email-router.ts

import { DeterministicRules } from './rules/deterministic-rules';
import { MLEmailClassifier } from './rules/ml-classifier';
import { EmailContextBuilder } from './context/context-builder';

export class EmailRouter {
  private rules: DeterministicRules;
  private mlClassifier: MLEmailClassifier;
  private contextBuilder: EmailContextBuilder;

  constructor() {
    this.rules = new DeterministicRules();
    this.mlClassifier = new MLEmailClassifier();
    this.contextBuilder = new EmailContextBuilder();
  }

  async route(email: Email): Promise<RoutingDecision> {
    // PASO 1: Build context (DB lookups)
    const context = await this.contextBuilder.buildContext(email);

    if (context.routing.destination) {
      // Context builder ya decidió (provider known, customer known)
      await this.logRouting(email, context.routing);
      return context.routing;
    }

    // PASO 2: Deterministic rules
    const deterministicResult = await this.applyDeterministicRules(email);
    if (deterministicResult.confidence >= 0.9) {
      await this.logRouting(email, deterministicResult);
      return deterministicResult;
    }

    // PASO 3: ML Classifier
    const mlResult = await this.mlClassifier.classify(email);
    const mappedDestination = this.mapCategoryToDestination(mlResult.category);

    if (mlResult.confidence >= 0.85) {
      const decision = {
        destination: mappedDestination,
        confidence: mlResult.confidence,
        reason: `ml_classifier:${mlResult.category}`
      };
      await this.logRouting(email, decision);
      return decision;
    }

    // PASO 4: Low confidence → Human
    const decision = {
      destination: 'HUMAN',
      confidence: mlResult.confidence,
      reason: 'low_confidence_needs_review'
    };
    await this.logRouting(email, decision);
    return decision;
  }

  private async applyDeterministicRules(email: Email): Promise<RoutingDecision> {
    // Check spam first
    const spamCheck = this.rules.isSpam(email);
    if (spamCheck.isSpam) {
      return {
        destination: 'IGNORE',
        confidence: spamCheck.confidence,
        reason: 'spam_detected'
      };
    }

    // Check out of scope
    const scopeCheck = this.rules.isOutOfScope(email);
    if (scopeCheck.isOutOfScope) {
      return {
        destination: 'IGNORE',
        confidence: 1.0,
        reason: `out_of_scope:${scopeCheck.reason}`
      };
    }

    // Check quotation indicators
    const quotationCheck = this.rules.isQuotationEmail(email);
    const hasTechAttachments = this.rules.hasTechnicalAttachments(email);

    if (quotationCheck.match || hasTechAttachments) {
      const confidence = Math.max(quotationCheck.score, hasTechAttachments ? 0.8 : 0);
      return {
        destination: 'FIN',
        confidence,
        reason: hasTechAttachments ? 'technical_attachments' : 'quotation_keywords'
      };
    }

    // No deterministic match
    return {
      destination: 'UNKNOWN',
      confidence: 0,
      reason: 'no_deterministic_match'
    };
  }

  private mapCategoryToDestination(category: string): RouteDestination {
    const mapping = {
      'CUSTOMER_QUOTATION': 'FIN',
      'PROVIDER_RESPONSE': 'PROVIDERS_AGENT',
      'GENERAL_INQUIRY': 'FIN',
      'ADMIN': 'HUMAN',
      'SPAM': 'IGNORE'
    };
    return mapping[category] || 'HUMAN';
  }

  private async logRouting(email: Email, decision: RoutingDecision) {
    await db.routing_logs.create({
      data: {
        email_id: email.id,
        email_from: email.from,
        email_subject: email.subject,
        destination: decision.destination,
        confidence: decision.confidence,
        reason: decision.reason,
        timestamp: new Date()
      }
    });
  }
}
```

#### 3.6. Crear tabla routing_logs

```sql
-- migrations/20251101_routing_logs.sql

CREATE TABLE routing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id VARCHAR(255),
  email_from VARCHAR(255) NOT NULL,
  email_subject TEXT,
  destination VARCHAR(50) NOT NULL, -- 'FIN', 'PROVIDERS_AGENT', 'HUMAN', 'IGNORE'
  confidence DECIMAL(3, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_destination (destination),
  INDEX idx_confidence (confidence),
  INDEX idx_timestamp (timestamp)
);
```

#### Entregables:
```
lib/routing/ ← Nueva carpeta completa
migrations/20251101_routing_logs.sql
tests/routing/email-router.test.ts ← Tests unitarios
docs/routing-logic.md ← Documentación
```

#### Criterios de éxito:
- ✅ Router clasifica correctamente 90% de emails históricos
- ✅ Tests pasan (90% coverage)
- ✅ Logs se guardan correctamente en DB

---

### FASE 4: Integración Router ↔ Intercom (Semana 3)
**Duración:** 5 días
**Esfuerzo:** 28 horas

#### 4.1. Crear webhook endpoint para Intercom

```typescript
// app/api/intercom/webhooks/route.ts

import { EmailRouter } from '@/lib/routing/email-router';
import crypto from 'crypto';

const router = new EmailRouter();

export async function POST(req: Request) {
  // 1. Verify webhook signature (security)
  const signature = req.headers.get('x-intercom-signature');
  const body = await req.text();

  if (!verifyIntercomSignature(signature, body)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  // 2. Handle different event types
  switch (event.type) {
    case 'conversation.user.created':
      return handleNewConversation(event);

    case 'conversation.user.replied':
      return handleUserReply(event);

    case 'conversation.admin.replied':
      // Fin o humano respondió, log it
      return handleAdminReply(event);

    default:
      return Response.json({ received: true });
  }
}

async function handleNewConversation(event: any) {
  const email = {
    id: event.data.conversation_id,
    from: event.data.user.email,
    subject: event.data.conversation_parts[0]?.subject || '',
    body: event.data.conversation_parts[0]?.body || '',
    threadId: event.data.conversation_id,
    attachments: event.data.conversation_parts[0]?.attachments || []
  };

  // Route email
  const decision = await router.route(email);

  // Execute routing decision
  switch (decision.destination) {
    case 'FIN':
      // Let Fin handle it (ya está en Intercom)
      await tagConversation(email.id, 'fin-handled');
      break;

    case 'PROVIDERS_AGENT':
      // Route to custom providers agent
      await tagConversation(email.id, 'providers-agent');
      await closeIntercomConversation(email.id); // Remove from Fin
      await processWithProvidersAgent(email);
      break;

    case 'HUMAN':
      // Assign to human team
      await tagConversation(email.id, 'human-review');
      await assignToTeam(email.id, 'human-team');
      break;

    case 'IGNORE':
      // Close and archive
      await tagConversation(email.id, 'ignored');
      await closeIntercomConversation(email.id);
      break;
  }

  return Response.json({
    routed: true,
    destination: decision.destination,
    confidence: decision.confidence
  });
}

function verifyIntercomSignature(signature: string | null, body: string): boolean {
  if (!signature) return false;

  const secret = process.env.INTERCOM_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const digest = hmac.digest('hex');

  return signature === digest;
}

async function tagConversation(conversationId: string, tag: string) {
  const intercomClient = getIntercomClient();
  await intercomClient.conversations.update(conversationId, {
    tags: { add: [tag] }
  });
}

async function assignToTeam(conversationId: string, teamName: string) {
  const intercomClient = getIntercomClient();
  const teams = await intercomClient.teams.list();
  const team = teams.data.find(t => t.name === teamName);

  if (team) {
    await intercomClient.conversations.assign(conversationId, {
      assignee_id: team.id,
      admin_id: null // Unassign from Fin
    });
  }
}
```

#### 4.2. Configurar webhooks en Intercom

```
Intercom Dashboard → Settings → Webhooks → Create webhook

URL: https://tu-dominio.com/api/intercom/webhooks
Events to subscribe:
  ✅ conversation.user.created
  ✅ conversation.user.replied
  ✅ conversation.admin.replied
  ✅ conversation.admin.closed

Webhook secret: [generar y guardar en .env]
```

#### 4.3. Crear cliente Intercom

```typescript
// lib/clients/intercom.client.ts
import { Client } from 'intercom-client';

let intercomClient: Client | null = null;

export function getIntercomClient(): Client {
  if (!intercomClient) {
    intercomClient = new Client({
      tokenAuth: { token: process.env.INTERCOM_ACCESS_TOKEN! }
    });
  }
  return intercomClient;
}

// Helper functions
export async function createIntercomContact(email: string, name?: string) {
  const client = getIntercomClient();
  return await client.contacts.create({
    email,
    name,
    custom_attributes: {
      source: 'arkcutt_quotation_system'
    }
  });
}

export async function sendMessageToConversation(conversationId: string, message: string) {
  const client = getIntercomClient();
  return await client.conversations.reply(conversationId, {
    type: 'admin',
    message_type: 'comment',
    body: message
  });
}
```

#### Entregables:
```
app/api/intercom/webhooks/route.ts
lib/clients/intercom.client.ts
.env.example ← Añadir INTERCOM_* vars
docs/intercom-integration.md
```

#### Criterios de éxito:
- ✅ Webhooks reciben eventos correctamente
- ✅ Routing funciona en tiempo real
- ✅ Tags se aplican correctamente en Intercom

---

### FASE 5: Desarrollo Providers Agent (Open Source) (Semana 4)
**Duración:** 7 días
**Esfuerzo:** 36 horas

#### 5.1. Setup Together AI (Qwen 2.5)

```bash
# Registrarse en together.ai
# Obtener API key
# Añadir a .env
TOGETHER_AI_API_KEY=xxxxx
```

#### 5.2. Crear Providers Agent

```typescript
// lib/agents/providers-agent-oss.ts

import { OpenAI } from 'openai';

export class ProvidersAgentOSS {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.TOGETHER_AI_API_KEY,
      baseURL: 'https://api.together.xyz/v1'
    });
  }

  async processProviderResponse(email: Email): Promise<ProviderAnalysis> {
    // 1. Find related RFQ
    const rfq = await this.findRelatedRFQ(email);
    if (!rfq) {
      throw new Error('No RFQ found for this provider email');
    }

    // 2. Extract quote data
    const quoteData = await this.extractQuoteData(email, rfq);

    // 3. Evaluate competitiveness
    const evaluation = await this.evaluateQuote(quoteData, rfq);

    // 4. Update DB
    await this.updateRFQWithResponse(rfq.id, quoteData, evaluation);

    // 5. Notify if action needed
    if (quoteData.necesita_aclaracion) {
      await this.requestClarification(email, quoteData.preguntas_aclaracion);
    }

    return {
      rfq_id: rfq.id,
      quote_data: quoteData,
      evaluation,
      action_needed: quoteData.necesita_aclaracion
    };
  }

  private async extractQuoteData(email: Email, rfq: ExternalQuotation) {
    const prompt = `Eres un experto en análisis de cotizaciones industriales.

CONTEXTO:
Enviamos RFQ a: ${rfq.provider_name}
Servicio solicitado: ${rfq.service_type}
Material: ${rfq.service_details.material || 'No especificado'}
Cantidad: ${rfq.service_details.quantity || 'No especificado'}

EMAIL RECIBIDO DEL PROVEEDOR:
Asunto: ${email.subject}
Cuerpo:
${email.body}

TAREA:
Extraer la siguiente información de la cotización:

1. Precio cotizado (número + moneda)
2. Plazo de entrega (número de días)
3. Condiciones especiales (lista)
4. Términos de pago
5. Validez de la oferta
6. ¿Necesita aclaración? (si hay información ambigua o faltante)
7. Preguntas para aclarar (lista)

IMPORTANTE:
- Si no menciona precio, marcar precio como null
- Si no menciona plazo, marcar plazo_dias como null
- Ser muy estricto con la extracción, no inventar datos

Responde SOLO con JSON válido:
{
  "precio": number | null,
  "moneda": "EUR" | "USD" | null,
  "plazo_dias": number | null,
  "condiciones_especiales": string[],
  "terminos_pago": string,
  "validez_oferta_dias": number | null,
  "necesita_aclaracion": boolean,
  "preguntas_aclaracion": string[],
  "notas_adicionales": string
}`;

    const completion = await this.client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  private async evaluateQuote(quoteData: any, rfq: ExternalQuotation) {
    // Get other quotes for comparison
    const otherQuotes = await db.external_quotations.findMany({
      where: {
        quotation_request_id: rfq.quotation_request_id,
        id: { not: rfq.id },
        status: 'received'
      }
    });

    if (otherQuotes.length === 0) {
      return {
        competitividad: 5, // Neutral si no hay comparación
        ranking: 1,
        diferencia_precio_promedio: null,
        recomendacion: 'Primera cotización recibida, esperar más ofertas'
      };
    }

    const prompt = `Evalúa la competitividad de esta cotización.

COTIZACIÓN A EVALUAR:
Precio: ${quoteData.precio} ${quoteData.moneda}
Plazo: ${quoteData.plazo_dias} días

OTRAS COTIZACIONES:
${otherQuotes.map((q, i) => `
  ${i + 1}. ${q.provider_name}
     Precio: ${q.provider_response?.precio} ${q.provider_response?.moneda}
     Plazo: ${q.provider_response?.plazo_dias} días
`).join('\n')}

Responde en JSON:
{
  "competitividad": number (1-10, 10=mejor oferta),
  "ranking": number (1=mejor, 2=segundo mejor, etc),
  "diferencia_precio_promedio_porcentaje": number,
  "recomendacion": string (150 caracteres max)
}`;

    const completion = await this.client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  private async requestClarification(email: Email, questions: string[]) {
    const rfq = await this.findRelatedRFQ(email);

    const prompt = `Genera un email profesional de seguimiento al proveedor ${email.from}.

PREGUNTAS A ACLARAR:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

TONO: Profesional, cordial, directo
IDIOMA: Español
LONGITUD: Máximo 200 palabras

Incluir:
- Agradecimiento por la cotización
- Solicitud de aclaración específica
- Plazo para respuesta (2 días hábiles)
- Datos de contacto Arkcutt

Formato: Email HTML listo para enviar (solo body, sin <html><head>)`;

    const completion = await this.client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const emailBody = completion.choices[0].message.content;

    // Send email via Gmail
    await sendEmail({
      to: email.from,
      subject: `Re: ${email.subject}`,
      html: emailBody,
      threadId: email.threadId
    });

    // Log interaction
    await db.quotation_interactions.create({
      data: {
        quotation_request_id: rfq.quotation_request_id,
        direction: 'outgoing',
        channel: 'email',
        content: emailBody,
        metadata: { type: 'clarification_request', questions }
      }
    });
  }
}
```

#### 5.3. Endpoint para procesar respuestas de proveedores

```typescript
// app/api/providers/process-response/route.ts

import { ProvidersAgentOSS } from '@/lib/agents/providers-agent-oss';

const agent = new ProvidersAgentOSS();

export async function POST(req: Request) {
  const { email } = await req.json();

  try {
    const result = await agent.processProviderResponse(email);

    return Response.json({
      success: true,
      rfq_id: result.rfq_id,
      quote_extracted: result.quote_data,
      evaluation: result.evaluation
    });
  } catch (error) {
    console.error('Error processing provider response:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

#### Entregables:
```
lib/agents/providers-agent-oss.ts
app/api/providers/process-response/route.ts
tests/agents/providers-agent.test.ts
docs/providers-agent-oss.md
```

#### Criterios de éxito:
- ✅ Extrae correctamente precio y plazo de 90% de emails de proveedores
- ✅ Evaluación de competitividad es coherente
- ✅ Emails de aclaración son profesionales

---

### FASE 6: Integración Completa Router → Fin/Providers (Semana 4-5)
**Duración:** 4 días
**Esfuerzo:** 20 horas

#### 6.1. Orquestar flujo completo

```typescript
// lib/orchestration/email-processor.ts

import { EmailRouter } from '@/lib/routing/email-router';
import { ProvidersAgentOSS } from '@/lib/agents/providers-agent-oss';
import { getIntercomClient } from '@/lib/clients/intercom.client';

export class EmailProcessor {
  private router: EmailRouter;
  private providersAgent: ProvidersAgentOSS;

  constructor() {
    this.router = new EmailRouter();
    this.providersAgent = new ProvidersAgentOSS();
  }

  async processIncomingEmail(email: Email) {
    // 1. Route email
    const decision = await this.router.route(email);

    // 2. Execute decision
    switch (decision.destination) {
      case 'FIN':
        return await this.routeToFin(email, decision);

      case 'PROVIDERS_AGENT':
        return await this.routeToProvidersAgent(email, decision);

      case 'HUMAN':
        return await this.routeToHuman(email, decision);

      case 'IGNORE':
        return await this.handleIgnore(email, decision);
    }
  }

  private async routeToFin(email: Email, decision: RoutingDecision) {
    // Email ya está en Intercom, solo taggearlo
    const intercom = getIntercomClient();

    await intercom.conversations.update(email.id, {
      tags: { add: ['fin-handled', `confidence-${Math.round(decision.confidence * 100)}`] },
      custom_attributes: {
        routing_reason: decision.reason,
        routing_confidence: decision.confidence
      }
    });

    // Log
    console.log(`Email ${email.id} routed to FIN (confidence: ${decision.confidence})`);
  }

  private async routeToProvidersAgent(email: Email, decision: RoutingDecision) {
    // 1. Remove from Intercom/Fin
    const intercom = getIntercomClient();
    await intercom.conversations.close(email.id);

    // 2. Process with custom agent
    const result = await this.providersAgent.processProviderResponse(email);

    // 3. Notify dashboard
    await this.notifyDashboard({
      type: 'PROVIDER_RESPONSE_RECEIVED',
      rfq_id: result.rfq_id,
      provider: email.from,
      quote_data: result.quote_data
    });

    console.log(`Provider response processed: RFQ ${result.rfq_id}`);
  }

  private async routeToHuman(email: Email, decision: RoutingDecision) {
    const intercom = getIntercomClient();

    // Assign to human team
    const teams = await intercom.teams.list();
    const humanTeam = teams.data.find(t => t.name === 'Human Review');

    await intercom.conversations.assign(email.id, {
      assignee_id: humanTeam?.id,
      admin_id: null
    });

    await intercom.conversations.update(email.id, {
      tags: { add: ['human-review-needed'] },
      priority: decision.confidence < 0.5 ? 'high' : 'normal'
    });

    console.log(`Email ${email.id} escalated to human (reason: ${decision.reason})`);
  }

  private async handleIgnore(email: Email, decision: RoutingDecision) {
    const intercom = getIntercomClient();

    await intercom.conversations.close(email.id);
    await intercom.conversations.update(email.id, {
      tags: { add: ['ignored', decision.reason] }
    });

    console.log(`Email ${email.id} ignored (reason: ${decision.reason})`);
  }

  private async notifyDashboard(event: any) {
    // Option 1: WebSocket (real-time)
    // await websocketServer.broadcast(event);

    // Option 2: Database event log (polling)
    await db.dashboard_events.create({
      data: {
        type: event.type,
        payload: event,
        created_at: new Date()
      }
    });
  }
}
```

#### 6.2. Modificar webhook para usar orchestrator

```typescript
// app/api/intercom/webhooks/route.ts (actualizado)

import { EmailProcessor } from '@/lib/orchestration/email-processor';

const processor = new EmailProcessor();

export async function POST(req: Request) {
  // ... verify signature ...

  const event = JSON.parse(body);

  if (event.type === 'conversation.user.created') {
    const email = extractEmailFromEvent(event);
    await processor.processIncomingEmail(email);
  }

  return Response.json({ processed: true });
}
```

#### Entregables:
```
lib/orchestration/email-processor.ts
migrations/20251101_dashboard_events.sql
tests/orchestration/email-processor.test.ts
```

#### Criterios de éxito:
- ✅ Emails se enrutan correctamente según decisión del router
- ✅ Fin recibe solo emails de clientes
- ✅ Providers agent procesa solo respuestas de proveedores
- ✅ Humanos reciben solo casos inciertos

---

## 5. GUÍA COMPLETA DE ENTRENAMIENTO DE FIN

### 5.1. Content Sources (Conocimiento)

**Paso 1: Preparar documentación de la empresa**

```markdown
<!-- knowledge/servicios-arkcutt.md -->

# Servicios de Arkcutt

## Servicios Internos (In-House)

### Mecanizado CNC
- Centro de mecanizado 3 ejes
- Centro de mecanizado 5 ejes
- Tolerancias: Hasta ±0.01mm
- Materiales: Aluminio, acero, plásticos técnicos
- Tamaño máximo pieza: 800x600x500mm

### Fresado
- Fresado convencional y CNC
- Acabados superficiales: Ra 0.8 - Ra 6.3
- Materiales compatibles: Metales, plásticos

### Torneado
- Torno CNC
- Diámetro máximo: 300mm
- Longitud máxima: 500mm

### Diseño CAD
- SolidWorks, AutoCAD
- Optimización para fabricación (DFM)
- Generación de planos técnicos

## Servicios Externos (Subcontratados)

### Tratamientos Superficiales
- Anodizado (tipos II y III)
- Cromado
- Niquelado
- Pintura industrial

### Tratamientos Térmicos
- Temple
- Revenido
- Normalizado
- Cementación

### Otros
- Soldadura TIG/MIG
- Corte por láser
- Corte por chorro de agua
- Electroerosión

## Materiales Trabajados

### Metales
- Aluminio: 6061, 6082, 7075
- Acero: S235, S355, F1140, inoxidable 304/316
- Latón, bronce, cobre
- Titanio (bajo pedido)

### Plásticos
- POM (Delrin)
- PEEK
- Nylon, Teflón
- PMMA, policarbonato

## Capacidades y Limitaciones

### Cantidades
- Prototipo: 1 unidad
- Series pequeñas: 2-100 unidades
- Series medianas: 100-1000 unidades
- Series grandes: Consultar viabilidad

### Plazos Estándar
- Cotización: 2-3 días hábiles
- Producción prototipo: 5-10 días
- Producción serie pequeña: 15-20 días
- Producción serie mediana: 30-45 días

### Tolerancias Estándar
- General: ±0.1mm (ISO 2768-m)
- Fina: ±0.05mm
- Alta precisión: ±0.01mm (requiere aprobación)

## Información para Cotización

### Datos Imprescindibles
1. Material específico (ej: Aluminio 6061-T6)
2. Cantidad de piezas
3. Planos técnicos (PDF, DXF, STEP)

### Datos Importantes
4. Tolerancias específicas
5. Acabado superficial requerido
6. Plazo de entrega deseado
7. Tratamientos adicionales

### Datos Opcionales
8. Uso final de la pieza
9. Presupuesto aproximado
10. Volumen anual estimado
```

**Paso 2: Crear FAQs**

```markdown
<!-- knowledge/faqs.md -->

# Preguntas Frecuentes

## P: ¿Cuánto tarda una cotización?
R: Normalmente enviamos cotizaciones en 2-3 días hábiles. Para proyectos urgentes, podemos priorizar y responder en 24 horas.

## P: ¿Trabajan con empresas fuera de España?
R: Sí, trabajamos con clientes en toda Europa y ocasionalmente fuera de la UE. Los envíos internacionales se coordinan según el caso.

## P: ¿Cuál es la cantidad mínima de pedido?
R: No hay mínimo. Trabajamos desde prototipos de 1 unidad hasta series de miles de piezas.

## P: ¿Hacen envíos urgentes?
R: Sí, ofrecemos servicio urgente con recargo. Consultar disponibilidad según la complejidad de la pieza.

## P: ¿Qué formato de planos aceptan?
R: PDF, DXF, DWG, STEP, STL, IGES. Preferimos STEP para piezas 3D complejas.

## P: ¿Firman NDA?
R: Sí, firmamos acuerdos de confidencialidad sin problema. Enviarnos el documento por email.

## P: ¿Hacen ingeniería inversa?
R: Sí, podemos trabajar desde una pieza física si no hay planos. Requiere envío de muestra.

## P: ¿Certifican las mediciones?
R: Sí, ofrecemos certificados de conformidad y reportes dimensionales (coste adicional).
```

**Paso 3: Subir a Intercom**

```
Intercom → Fin → Content
→ Add content source
→ Type: Articles
→ Import from: Markdown files

Subir:
- servicios-arkcutt.md
- faqs.md
- materiales-database.md
- tolerancias-iso.md
```

---

### 5.2. Conversaciones de Ejemplo (Training Snippets)

**Crear 20-30 conversaciones modelo que cubran:**

```yaml
# conversation_01_simple_quotation.yaml
conversation:
  customer_intent: "Solicitud simple de presupuesto"

  customer: |
    Hola, necesito presupuesto para 50 piezas en aluminio 6061.
    Adjunto plano PDF.

  fin_response: |
    ¡Hola! Gracias por contactarnos.

    He recibido tu solicitud para 50 piezas en aluminio 6061 y el plano adjunto.

    Para darte un presupuesto preciso, necesito algunos datos adicionales:

    1. **Acabado superficial**: ¿Necesitas algún tratamiento? (anodizado, sin tratar, etc.)
    2. **Tolerancias**: ¿Aplican tolerancias especiales o sirven las estándar (±0.1mm)?
    3. **Plazo**: ¿Cuándo necesitarías las piezas?

    Con esta información podré enviarte cotización en 24-48h.

    Saludos,
    Asistente Arkcutt

  customer: |
    Anodizado negro, tolerancias estándar, necesito para dentro de 3 semanas.

  fin_response: |
    Perfecto, tengo toda la información:

    ✅ 50 piezas aluminio 6061
    ✅ Anodizado negro (tipo II)
    ✅ Tolerancias ISO 2768-m (±0.1mm)
    ✅ Plazo: 3 semanas
    ✅ Plano: [nombre_archivo.pdf]

    Procesaré tu solicitud y recibirás presupuesto detallado en las próximas 48 horas.

    ¿Hay algo más que deba saber sobre este proyecto?

  customer: |
    No, con eso es suficiente. Gracias.

  fin_response: |
    Excelente. Te confirmo que tu solicitud está registrada con el ID #QR-2025-001.

    Recibirás el presupuesto en tu email en máximo 48 horas.

    ¡Que tengas un buen día!

# Tags para este snippet
tags:
  - simple_quotation
  - complete_info_flow
  - anodizado
  - aluminum
```

**Otros snippets importantes:**

```yaml
# conversation_02_missing_technical_drawing.yaml
# conversation_03_material_substitution_suggestion.yaml
# conversation_04_urgentdelivery_inquiry.yaml
# conversation_05_prototype_vs_production.yaml
# conversation_06_tolerance_clarification.yaml
# conversation_07_nda_request.yaml
# conversation_08_payment_terms.yaml
# conversation_09_international_shipping.yaml
# conversation_10_general_capabilities_inquiry.yaml
```

**Subir a Intercom:**

```
Intercom → Fin → Conversations
→ Import example conversations
→ Paste YAML or manually create via UI
```

---

### 5.3. Workflows (Custom Actions)

**Workflow 1: Extraer datos técnicos completos**

```javascript
// Intercom → Fin → Workflows → Create new

Workflow: "extract_quotation_data"
Trigger: "When customer provides quotation request"

Actions:
1. Extract data from conversation:
   - material
   - quantity
   - tolerances
   - surface_finish
   - deadline
   - attachments

2. Call webhook:
   URL: https://tu-dominio.com/api/fin/extract-quotation-data
   Method: POST
   Body: {
     conversation_id: {{conversation.id}},
     customer_email: {{user.email}},
     extracted_data: {{step1.output}}
   }

3. Wait for webhook response

4. If response.status == "complete":
     Send message: "Perfecto, tengo toda la información..."
   Else if response.status == "missing_data":
     Send message: "Necesito algunos datos adicionales: {{response.missing_fields}}"
```

**Endpoint correspondiente:**

```typescript
// app/api/fin/extract-quotation-data/route.ts

export async function POST(req: Request) {
  const { conversation_id, customer_email, extracted_data } = await req.json();

  // Validar datos
  const required = ['material', 'quantity'];
  const missing = required.filter(field => !extracted_data[field]);

  if (missing.length > 0) {
    return Response.json({
      status: 'missing_data',
      missing_fields: missing.map(f => translateField(f))
    });
  }

  // Crear quotation request en DB
  const quotation = await db.quotation_requests.create({
    data: {
      customer_email,
      conversation_thread_id: conversation_id,
      datos_tecnicos: extracted_data,
      status: 'pending',
      source: 'fin_intercom'
    }
  });

  return Response.json({
    status: 'complete',
    quotation_id: quotation.id
  });
}
```

**Workflow 2: Búsqueda de proveedores**

```javascript
Workflow: "search_external_providers"
Trigger: "When service requires external provider"

Actions:
1. Determine required service (anodizado, tratamiento, etc)

2. Call webhook:
   URL: https://tu-dominio.com/api/fin/search-providers
   Body: {
     service_type: {{step1.service}},
     material: {{conversation.material}},
     quantity: {{conversation.quantity}}
   }

3. Return providers found:
   "He encontrado {{step2.provider_count}} proveedores especializados.
    Enviaremos solicitudes de cotización y te contactaremos cuando
    tengamos respuestas (generalmente 3-5 días hábiles)."
```

---

### 5.4. Fine-tuning Tono y Personalidad

```yaml
# Intercom → Fin → Personality

tone: |
  Eres el asistente de Arkcutt, empresa de mecanizado industrial en España.

  PERSONALIDAD:
  - Profesional pero cercano
  - Técnicamente competente (usas términos correctos: tolerancias ISO, grados de aluminio)
  - Proactivo: anticipas necesidades del cliente
  - Conciso: respuestas claras, no divagar

  NUNCA:
  - No des precios sin consultar al equipo humano
  - No prometas plazos que no puedas cumplir
  - No inventes capacidades que Arkcutt no tiene

  SIEMPRE:
  - Confirma la información recibida antes de procesar
  - Si algo no está claro, pregunta en vez de asumir
  - Si no sabes algo, deriva a humano: "Déjame consultar con el equipo técnico"

example_phrases:
  greeting: "¡Hola! Soy el asistente de Arkcutt. ¿En qué puedo ayudarte hoy?"

  request_info: |
    Para darte un presupuesto preciso, necesito estos datos:
    [lista numerada]

  confirm_data: |
    Perfecto, confirmo que he entendido:
    ✅ [dato 1]
    ✅ [dato 2]
    ¿Es correcto?

  escalate: |
    Este caso requiere análisis de nuestro equipo técnico.
    Te contactaremos por email en las próximas 24h.

  closing: |
    Tu solicitud está registrada. Recibirás respuesta en [plazo].
    ¿Hay algo más en lo que pueda ayudarte?

language_style:
  formality: "professional_friendly" # tú/usted según cliente
  technical_level: "medium_high" # usar términos técnicos pero explicar si hace falta
  emoji_usage: "minimal" # solo ✅ ❌ para listas
```

---

### 5.5. Reglas de Escalación

```yaml
# Intercom → Fin → Escalation rules

escalate_to_human_when:
  - confidence < 0.6
  - customer_frustrated: true (detectar: "hablar con humano", "quiero gerente")
  - custom_request: true (fuera de capacidades documentadas)
  - pricing_inquiry: true (precios específicos)
  - legal_inquiry: true (contratos, garantías, responsabilidades)
  - after_attempts: 3 (si tras 3 mensajes no resuelve, escalar)

escalation_message: |
  Voy a conectarte con un miembro de nuestro equipo para que te ayude personalmente.
  Suelen responder en menos de 2 horas en horario laboral.

human_context: |
  [Fin proporciona a humano]

  Resumen conversación:
  - Cliente solicita: [extracto]
  - Información recopilada: [datos]
  - Motivo escalación: [razón]
  - Siguiente paso sugerido: [acción]
```

---

## 6. MIGRACIÓN DE CÓDIGO EXISTENTE

### 6.1. Código a MANTENER

```typescript
// ✅ MANTENER - Providers agent custom
lib/agents/providers-agent-oss.ts (nuevo OSS version)
lib/tools/provider-search.tools.ts
lib/tools/gmail.tools.ts (parcial - solo envío)

// ✅ MANTENER - Database & core logic
lib/services/quotation.service.ts
lib/services/settings.service.ts
database migrations

// ✅ MANTENER - Dashboard
app/(app)/* (todas las páginas Next.js)
components/* (UI components)
```

### 6.2. Código a DEPRECAR (gradualmente)

```typescript
// ⚠️ DEPRECAR - Será reemplazado por Fin
lib/agents/quotation-coordinator.agent.ts
  → Fase 1-4: Mantener en paralelo (feature flag)
  → Fase 5-8: Solo para clientes legacy
  → Fase 9+: Eliminar completamente

lib/guardrails/email-classifier.ts
  → Reemplazado por: lib/routing/email-router.ts

app/api/cron/process-emails/route.ts
  → Reemplazado por: Intercom webhooks
  → PERO mantener como fallback durante 2 meses
```

### 6.3. Estrategia de Feature Flags

```typescript
// lib/config/feature-flags.ts

interface ClientFeatureFlags {
  client_id: string;
  use_fin_for_customers: boolean;
  use_oss_for_providers: boolean;
  legacy_mode: boolean;
}

export async function getClientFlags(clientId: string): Promise<ClientFeatureFlags> {
  const config = await db.client_configs.findUnique({
    where: { client_id: clientId }
  });

  return config?.feature_flags || {
    use_fin_for_customers: false, // Default: legacy mode
    use_oss_for_providers: false,
    legacy_mode: true
  };
}

// Uso en código
const flags = await getClientFlags('empresa_xyz');

if (flags.use_fin_for_customers) {
  // Nuevo flujo Fin
  await processor.routeToFin(email);
} else {
  // Legacy flujo
  await quotationCoordinator.process(email);
}
```

### 6.4. Plan de Migración por Fases

```yaml
Fase 1-4 (Semana 1-3):
  - 100% clientes en legacy
  - 0% en Fin
  - Testing solo interno

Fase 5-6 (Semana 4):
  - 90% legacy
  - 10% Fin (1 cliente piloto seleccionado)
  - Monitoring intensivo

Fase 7-8 (Semana 5-6):
  - 50% legacy
  - 50% Fin (clientes nuevos + voluntarios)
  - A/B testing métricas

Fase 9-10 (Semana 7-8):
  - 10% legacy (solo clientes que solicitaron permanecer)
  - 90% Fin
  - Preparar deprecación

Fase 11-12 (Semana 9-10):
  - 0% legacy (excepto casos especiales)
  - 100% Fin
  - Eliminar código deprecated
```

---

## 7. PLAN DE TESTING

### 7.1. Tests Unitarios

```typescript
// tests/routing/email-router.test.ts

describe('EmailRouter', () => {
  describe('Deterministic Rules', () => {
    it('should route to FIN when email has technical attachments', async () => {
      const email = {
        from: 'cliente@example.com',
        subject: 'Consulta',
        body: 'Hola',
        attachments: [{ filename: 'plano.pdf', type: 'application/pdf' }]
      };

      const router = new EmailRouter();
      const decision = await router.route(email);

      expect(decision.destination).toBe('FIN');
      expect(decision.confidence).toBeGreaterThan(0.8);
      expect(decision.reason).toBe('technical_attachments');
    });

    it('should route to PROVIDERS_AGENT when from known provider', async () => {
      // Setup: crear provider en DB
      await db.provider_contacts.create({
        data: { email: 'proveedor@example.com', company_name: 'Test Provider' }
      });

      const email = {
        from: 'proveedor@example.com',
        subject: 'Re: Cotización',
        body: 'Nuestro precio es...'
      };

      const router = new EmailRouter();
      const decision = await router.route(email);

      expect(decision.destination).toBe('PROVIDERS_AGENT');
      expect(decision.confidence).toBe(1.0);
    });

    it('should route to IGNORE when spam detected', async () => {
      const email = {
        from: 'spam@viagra.com',
        subject: '¡GANASTE! Click aquí',
        body: 'Oferta limitada 100% gratis'
      };

      const router = new EmailRouter();
      const decision = await router.route(email);

      expect(decision.destination).toBe('IGNORE');
      expect(decision.reason).toBe('spam_detected');
    });
  });

  describe('Providers Agent OSS', () => {
    it('should extract quote data from provider email', async () => {
      const email = {
        from: 'proveedor@example.com',
        subject: 'Re: RFQ-123',
        body: 'Nuestro precio para anodizado es 15€/pieza. Plazo de entrega: 7 días.'
      };

      const agent = new ProvidersAgentOSS();
      const result = await agent.extractQuoteData(email, mockRFQ);

      expect(result.precio).toBe(15);
      expect(result.moneda).toBe('EUR');
      expect(result.plazo_dias).toBe(7);
    });
  });
});
```

### 7.2. Tests de Integración

```typescript
// tests/integration/email-flow.test.ts

describe('End-to-end email processing', () => {
  it('should process customer quotation request completely', async () => {
    // 1. Simular email entrante
    const email = createMockEmail({
      from: 'newcustomer@example.com',
      subject: 'Presupuesto mecanizado',
      body: 'Necesito 100 piezas en aluminio 6061',
      attachments: ['plano.pdf']
    });

    // 2. Procesar con orchestrator
    const processor = new EmailProcessor();
    await processor.processIncomingEmail(email);

    // 3. Verificar routing
    const routingLog = await db.routing_logs.findFirst({
      where: { email_id: email.id }
    });
    expect(routingLog.destination).toBe('FIN');

    // 4. Verificar creación en Intercom (mock)
    expect(intercomMock.conversations.create).toHaveBeenCalled();

    // 5. Verificar quotation_request creado
    const quotation = await db.quotation_requests.findFirst({
      where: { customer_email: email.from }
    });
    expect(quotation).toBeTruthy();
    expect(quotation.status).toBe('gathering_info');
  });
});
```

### 7.3. Tests con Emails Históricos Reales

```typescript
// tests/historical/real-emails.test.ts

// Usar 100 emails reales del sistema actual
const historicalEmails = await loadHistoricalEmails('data/emails-2024.json');

describe('Historical email accuracy', () => {
  it('should correctly classify 90% of historical emails', async () => {
    const router = new EmailRouter();
    let correct = 0;

    for (const { email, expected_destination } of historicalEmails) {
      const decision = await router.route(email);

      if (decision.destination === expected_destination) {
        correct++;
      }
    }

    const accuracy = correct / historicalEmails.length;
    expect(accuracy).toBeGreaterThan(0.90);
  });
});
```

---

## 8. PLAN DE ROLLBACK

### Estrategia de Contingencia

```yaml
Rollback Triggers:
  - Accuracy < 85% (clasificación incorrecta)
  - Customer satisfaction < 4.0/5
  - Fin downtime > 2 horas
  - Critical bug en producción
  - Costes Fin > 150% proyectado

Rollback Process:
  1. Activar feature flag legacy_mode = true (todos clientes)
  2. Intercom webhooks → pausar
  3. Reactivar cron job original (process-emails)
  4. Notificar equipo y stakeholders
  5. Analizar causa raíz
  6. Documentar lecciones aprendidas

Backup Strategy:
  - DB snapshot antes de cada fase
  - Código legacy en branch backup/pre-fin
  - Emails históricos guardados (no borrar)
  - Configuración Intercom exportada

Recovery Time Objective (RTO):
  - Detección de problema: 15 min (monitoring)
  - Decisión de rollback: 30 min (equipo)
  - Ejecución rollback: 1 hora
  - Verificación sistema OK: 30 min
  - Total: 2 horas 15 min
```

---

## 9. MONITOREO Y MÉTRICAS

### 9.1. KPIs a Trackear

```typescript
// lib/monitoring/metrics.ts

interface SystemMetrics {
  // Routing performance
  routing_accuracy: number; // % emails bien clasificados
  routing_confidence_avg: number;
  routing_latency_ms: number;

  // Fin performance
  fin_resolution_rate: number; // % resuelto sin humano
  fin_avg_messages_to_resolve: number;
  fin_customer_satisfaction: number; // 1-5
  fin_cost_per_resolution: number; // €

  // Providers agent
  provider_extraction_accuracy: number; // % datos correctos
  provider_response_time_hours: number;

  // Business metrics
  quotations_created_per_day: number;
  time_to_quotation_days: number;
  conversion_rate: number; // quotations → orders
}

async function calculateMetrics(period: 'day' | 'week' | 'month'): Promise<SystemMetrics> {
  const startDate = getStartDate(period);

  const routingLogs = await db.routing_logs.findMany({
    where: { timestamp: { gte: startDate } }
  });

  // Calcular cada métrica...

  return metrics;
}
```

### 9.2. Dashboard de Métricas

```typescript
// app/(app)/metrics/page.tsx

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetch(`/api/metrics?period=${period}`)
      .then(res => res.json())
      .then(setMetrics);
  }, [period]);

  return (
    <div>
      <h1>System Metrics</h1>

      {/* Routing Performance */}
      <Card>
        <h2>Email Routing</h2>
        <Metric
          label="Accuracy"
          value={`${(metrics.routing_accuracy * 100).toFixed(1)}%`}
          target="90%"
          status={metrics.routing_accuracy >= 0.9 ? 'good' : 'warning'}
        />
        <Metric
          label="Avg Confidence"
          value={metrics.routing_confidence_avg.toFixed(2)}
        />
      </Card>

      {/* Fin Performance */}
      <Card>
        <h2>Fin AI Agent</h2>
        <Metric
          label="Resolution Rate"
          value={`${(metrics.fin_resolution_rate * 100).toFixed(1)}%`}
        />
        <Metric
          label="Customer Satisfaction"
          value={`${metrics.fin_customer_satisfaction.toFixed(1)}/5.0`}
        />
        <Metric
          label="Cost per Resolution"
          value={`€${metrics.fin_cost_per_resolution.toFixed(2)}`}
        />
      </Card>

      {/* Comparison: Fin vs Legacy */}
      <Card>
        <h2>Fin vs Legacy (A/B Test)</h2>
        <ComparisonChart
          finMetrics={metrics.fin}
          legacyMetrics={metrics.legacy}
        />
      </Card>
    </div>
  );
}
```

### 9.3. Alertas Automáticas

```typescript
// lib/monitoring/alerts.ts

async function checkAlertsAndNotify() {
  const metrics = await calculateMetrics('day');

  const alerts = [];

  // Alert 1: Routing accuracy bajando
  if (metrics.routing_accuracy < 0.85) {
    alerts.push({
      severity: 'high',
      message: `Routing accuracy is ${(metrics.routing_accuracy * 100).toFixed(1)}% (threshold: 85%)`,
      action: 'Review routing logs and adjust rules'
    });
  }

  // Alert 2: Fin coste muy alto
  if (metrics.fin_cost_per_resolution > 2.0) {
    alerts.push({
      severity: 'medium',
      message: `Fin cost per resolution: €${metrics.fin_cost_per_resolution} (threshold: €2.00)`,
      action: 'Consider increasing confidence threshold to use Fin less'
    });
  }

  // Alert 3: Satisfacción cliente baja
  if (metrics.fin_customer_satisfaction < 4.0) {
    alerts.push({
      severity: 'high',
      message: `Customer satisfaction: ${metrics.fin_customer_satisfaction}/5 (threshold: 4.0)`,
      action: 'Review Fin training and escalation rules'
    });
  }

  // Enviar alertas
  if (alerts.length > 0) {
    await sendSlackNotification(alerts); // o email
  }
}

// Ejecutar cada hora
setInterval(checkAlertsAndNotify, 60 * 60 * 1000);
```

---

## 10. ESTIMACIÓN DE COSTES

### 10.1. Costes de Desarrollo (One-time)

| Fase | Tarea | Horas | Coste ($50/h) |
|------|-------|-------|---------------|
| 0 | Preparación | 12h | $600 |
| 1 | Setup Intercom + Fin | 24h | $1,200 |
| 2 | Entrenamiento Fin | 32h | $1,600 |
| 3 | Email Router | 40h | $2,000 |
| 4 | Integración Intercom | 28h | $1,400 |
| 5 | Providers Agent OSS | 36h | $1,800 |
| 6 | Orquestación completa | 20h | $1,000 |
| 7-12 | Testing + ajustes | 28h | $1,400 |
| **TOTAL** | | **220h** | **$11,000** |

### 10.2. Costes Operacionales (Mensuales)

```yaml
Escenario 1: Cliente pequeño (200 emails/mes)
  Fin Intercom: $200/mes (140 resoluciones × $0.99 + base)
  Together AI (providers): $20/mes
  Hosting/DB: $50/mes
  Total: $270/mes

  Precio al cliente: $399/mes
  Margen: $129/mes (32%)

Escenario 2: Cliente mediano (500 emails/mes)
  Fin Intercom: $400/mes (300 resoluciones)
  Together AI: $40/mes
  Hosting/DB: $80/mes
  Total: $520/mes

  Precio al cliente: $699/mes
  Margen: $179/mes (26%)

Escenario 3: Cliente grande (1500 emails/mes)
  Fin Intercom: $300/mes (solo 150 casos complejos, resto OSS)
  Together AI: $100/mes (mayor volumen)
  Hosting/DB: $150/mes
  Total: $550/mes

  Precio al cliente: $999/mes
  Margen: $449/mes (45%)
```

### 10.3. ROI Proyectado

```yaml
Año 1:
  Inversión inicial: $11,000
  Costes operacionales: $5,000 (promedio $400/mes × 12)
  Total invertido: $16,000

  Ingresos (5 clientes promedio):
    3 pequeños × $399 × 12 = $14,364
    2 medianos × $699 × 12 = $16,776
    Total: $31,140

  Beneficio neto año 1: $15,140
  ROI: 95%

Año 2:
  Costes operacionales: $6,000
  Ingresos (10 clientes):
    5 pequeños × $399 × 12 = $23,940
    3 medianos × $699 × 12 = $25,164
    2 grandes × $999 × 12 = $23,976
    Total: $73,080

  Beneficio neto año 2: $67,080
  ROI acumulado: 320%
```

---

## RESUMEN EJECUTIVO

### Timeline General

```
Semana 0: Preparación
Semana 1: Setup Intercom + Fin básico
Semana 2: Entrenamiento Fin
Semana 3: Email Router
Semana 4: Providers Agent OSS
Semana 5-6: Integración y testing
Semana 7-8: Piloto con clientes reales
Semana 9-10: Rollout completo
Semana 11-12: Optimización y documentación
```

### Decisiones Clave Tomadas

1. **Arquitectura Híbrida**: Fin (clientes) + OSS (proveedores)
2. **Router Pre-Fin**: Sistema inteligente que diferencia emails
3. **Feature Flags**: Migración gradual sin riesgo
4. **Together AI + Qwen 2.5**: Mejor coste/calidad para providers
5. **Rollback Plan**: Máximo 2h para volver a sistema anterior

### Próximos Pasos Inmediatos

1. [ ] Aprobar este plan
2. [ ] Crear cuenta trial Intercom
3. [ ] Backup DB producción
4. [ ] Iniciar Fase 0 (preparación)

---

**Documento generado:** 2025-11-01
**Autor:** Claude Code
**Versión:** 1.0
**Branch:** feat/fin-intercom-integration
