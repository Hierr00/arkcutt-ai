# 🎯 ARKCUTT AI AGENT - PRODUCT ROADMAP V2

**Fecha:** 18 Octubre 2025
**Versión:** 2.0 - Enfoque en Workflow de Cotización
**Estado:** Arquitectura definida, listo para implementación

---

## 🚀 VISIÓN DEL PRODUCTO

### Lo que SÍ somos:
**Un agente AI que automatiza la recopilación de información para presupuestos de mecanizado CNC**

### Lo que NO somos:
- ❌ Un chatbot general
- ❌ Un generador automático de presupuestos finales
- ❌ Un reemplazo completo del humano

### El Valor Real:
Reducir el tiempo de recopilación de información de **2-3 días → 2-3 horas** para que el humano pueda crear presupuestos más rápido y precisos.

---

## 📊 WORKFLOW OBJETIVO

```
┌─────────────────────────────────────────────────────────────┐
│  1. CLIENTE envía email: "Necesito 100 piezas de aluminio"  │
│     + Adjuntos: plano.pdf                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  2. AGENTE lee email + archivos adjuntos                     │
│     → Guardrails: ¿Es solicitud de presupuesto legítima?    │
│        • SÍ → Continuar                                      │
│        • NO → Escalar a humano                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  3. AGENTE extrae información del email/adjuntos:            │
│     ✓ Cantidad: 100 piezas                                   │
│     ✓ Material: Aluminio (sin especificar aleación)         │
│     ✓ Plano: plano.pdf                                       │
│     ✗ FALTA: Tolerancias                                     │
│     ✗ FALTA: Acabado superficial                             │
│     ✗ FALTA: Plazo de entrega                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  4. AGENTE solicita información faltante al cliente:         │
│     Email → "Hola, gracias por su consulta. Para poder       │
│     ofrecerle un presupuesto preciso, necesitamos:           │
│     - ¿Qué aleación de aluminio? (6061, 7075, etc.)          │
│     - ¿Tolerancias requeridas?                               │
│     - ¿Acabado superficial necesario?                        │
│     - ¿Plazo de entrega?"                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  5. CLIENTE responde con info faltante                       │
│     → AGENTE actualiza solicitud                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  6. AGENTE identifica servicios necesarios:                  │
│     INTERNOS:                                                │
│     ✓ Mecanizado CNC → SÍ (Arkcutt lo hace)                  │
│                                                              │
│     EXTERNOS:                                                │
│     ✗ Anodizado negro → NO (necesita proveedor)              │
│     ✗ Material AA7075 → NO en stock (necesita proveedor)     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  7. AGENTE busca proveedores externos:                       │
│     a) Busca en Knowledge Base                               │
│     b) Si no hay suficientes, busca en Google Places         │
│     c) Extrae contacto (email, teléfono)                     │
│                                                              │
│     Encontrados:                                             │
│     - TreatMetal Pro (anodizado) - tratmetal@...             │
│     - MetalStock (material) - ventas@metalstock...           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  8. AGENTE contacta proveedores pidiendo cotización:         │
│     Email → "Estimados señores de TreatMetal,                │
│     necesitamos cotizar: Anodizado negro tipo II             │
│     para 100 piezas de aluminio 7075..."                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  9. PROVEEDORES responden (2-24 horas)                       │
│     → AGENTE recopila respuestas                             │
│     → Actualiza base de datos                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  10. AGENTE entrega PAQUETE COMPLETO al HUMANO:              │
│                                                              │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║ PEDIDO #1234 - Cliente: Acme Corp                     ║  │
│  ╠═══════════════════════════════════════════════════════╣  │
│  ║ ✅ INFORMACIÓN DEL CLIENTE:                            ║  │
│  ║    • 100 piezas                                        ║  │
│  ║    • Material: Aluminio 7075-T6                        ║  │
│  ║    • Plano: pedido_1234.pdf                            ║  │
│  ║    • Tolerancias: ±0.05mm                              ║  │
│  ║    • Acabado: Anodizado negro tipo II                  ║  │
│  ║    • Plazo: 3 semanas                                  ║  │
│  ║                                                        ║  │
│  ║ ✅ SERVICIOS INTERNOS:                                 ║  │
│  ║    • Mecanizado CNC: SÍ (5 días estimados)             ║  │
│  ║                                                        ║  │
│  ║ ⚠️  SERVICIOS EXTERNOS COTIZADOS:                      ║  │
│  ║    • Material AA7075 (100kg):                          ║  │
│  ║      → MetalStock: €850, 2 días                        ║  │
│  ║      → AluminiosEsp: €780, 3 días ⭐ MEJOR             ║  │
│  ║    • Anodizado negro (100 piezas):                     ║  │
│  ║      → TreatMetal Pro: €450, 5 días                    ║  │
│  ║      → AnoMaster: Esperando respuesta...               ║  │
│  ║                                                        ║  │
│  ║ 💰 COSTOS ESTIMADOS EXTERNOS:                          ║  │
│  ║    • Material: €780                                    ║  │
│  ║    • Anodizado: €450                                   ║  │
│  ║    • Subtotal externo: €1,230                          ║  │
│  ║                                                        ║  │
│  ║ 📎 ADJUNTOS:                                           ║  │
│  ║    • plano_cliente.pdf                                 ║  │
│  ║    • cotizacion_metalstock.pdf                         ║  │
│  ║    • cotizacion_treatmetal.pdf                         ║  │
│  ║                                                        ║  │
│  ║ ✅ LISTO PARA PRESUPUESTO HUMANO                       ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  11. HUMANO crea presupuesto final:                          │
│      • Añade costo de mecanizado (su experiencia)            │
│      • Añade margen                                          │
│      • Revisa viabilidad técnica                             │
│      • Envía presupuesto al cliente                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗄️ ARQUITECTURA DE BASE DE DATOS

### Tablas Principales

#### `quotation_requests`
Cada solicitud de presupuesto entrante.

```sql
- id (UUID)
- external_id (email ID)
- status (pending | gathering_info | waiting_providers | ready_for_human | quoted)
- customer_email
- customer_name
- customer_company
- parts_description
- quantity
- material_requested
- tolerances
- surface_finish
- delivery_deadline
- attachments (JSONB)
- missing_info (TEXT[])
- internal_services (JSONB)
- external_services (JSONB)
- conversation_thread_id
- agent_analysis (JSONB)
- created_at
- assigned_to (humano)
```

#### `external_quotations`
Cotizaciones solicitadas a proveedores externos.

```sql
- id (UUID)
- quotation_request_id (FK)
- provider_name
- provider_email
- service_type (anodizado | tratamiento_termico | material)
- service_details (JSONB)
- status (pending | sent | received | expired)
- provider_response (JSONB) → { price, lead_time, notes }
- gmail_message_id
- created_at
- expires_at
```

#### `quotation_interactions`
Historial de emails con clientes.

```sql
- id (UUID)
- quotation_request_id (FK)
- type (email_received | email_sent | info_request | info_provided)
- direction (inbound | outbound)
- subject
- body
- attachments (JSONB)
- gmail_message_id
- extracted_data (JSONB)
- created_at
```

#### `guardrails_log`
Registro de decisiones de seguridad.

```sql
- id (UUID)
- email_id
- email_from
- decision (handle | escalate | ignore)
- confidence (0.0 - 1.0)
- reasons (JSONB)
- email_type (quotation_request | spam | out_of_scope | complaint)
- action_taken
- created_at
```

#### `provider_contacts`
Catálogo de proveedores con métricas.

```sql
- id (UUID)
- name
- email
- phone
- website
- services (TEXT[])
- materials (TEXT[])
- total_quotes_requested
- total_quotes_received
- response_rate (%)
- avg_response_time_hours
- reliability_score (0.0 - 1.0)
- google_place_id
- is_active
- blacklisted
```

---

## 🛡️ GUARDRAILS CRÍTICOS

### Email Classifier

Decide si un email debe ser manejado automáticamente:

```typescript
interface EmailClassification {
  decision: 'handle' | 'escalate' | 'ignore';
  confidence: number;
  emailType: 'quotation_request' | 'general_inquiry' | 'complaint' | 'spam' | 'out_of_scope';
  reasons: Array<{ rule: string; passed: boolean; confidence?: number }>;
}
```

### Reglas de Clasificación:

1. **✅ HANDLE** - Manejo automático si:
   - Tiene keywords de cotización (presupuesto, cotizar, precio, etc.)
   - Tiene adjuntos técnicos (PDF, DXF, STEP, etc.)
   - No es spam
   - Está dentro del alcance (mecanizado CNC)
   - **Confianza > 75%**

2. **⚠️ ESCALATE** - Enviar a humano si:
   - Es una queja o problema
   - Fuera del alcance (soldadura, pintura, etc.)
   - Consulta general ambigua
   - **Confianza < 75%**

3. **❌ IGNORE** - Ignorar si:
   - Es spam obvio
   - **Confianza > 90%**

### Regla de Oro:
**"En caso de duda, ESCALATE"**
Mejor que un humano revise un email legítimo que el agente responda algo incorrecto.

---

## 🔧 TOOLS IMPLEMENTADOS

### 1. Gmail Tools (`gmail.tools.ts`)

- `readUnreadQuotationEmails()` - Lee emails no leídos
- `sendEmail({ to, subject, body, threadId })` - Envía email
- `getEmailAttachments(messageId, attachmentIds)` - Descarga adjuntos
- `markEmailAsRead(messageId)` - Marca como leído
- `addLabelToEmail(messageId, label)` - Añade etiqueta

### 2. Provider Search Tools (`provider-search.tools.ts`)

- `findProviders({ service, material, location })` - Busca proveedores
  - Busca primero en BD
  - Si no hay suficientes, busca en Google Places
  - Extrae contacto y detalles
- `getProviderDetails(googlePlaceId)` - Detalles completos
- `searchProvidersInDatabase(service, material)` - Solo BD
- `searchProvidersOnGoogle(input)` - Solo Google Places

### 3. Material Tools (`material.tools.ts`)

- `checkMaterialStock(material_code)` - Verifica stock
- `getMaterialProperties(material_query)` - Propiedades técnicas
- `findMaterialSupplier(material_code)` - Encuentra proveedor de material
- `suggestAlternatives(original, requirements)` - Sugiere alternativas

### 4. Providers Tools (`providers.tools.ts`)

- `searchProviders({ service_type, material })` - Busca proveedores en KB
- `getProviderInfo(provider_name)` - Info detallada
- `generateProviderEmail({ provider, service, material })` - Email cotización
- `checkIfServiceIsExternal(service_description)` - Clasifica interno/externo

### 5. Guardrails (`email-classifier.ts`)

- `classifyEmail(email)` - Clasifica email entrante
- Reglas determinísticas + LLM
- Logging automático en `guardrails_log`

---

## 📋 PRÓXIMOS PASOS INMEDIATOS

### SEMANA 1: Setup Básico

#### Día 1-2: Configuración
- [ ] Ejecutar migración 005 en Supabase
- [ ] Configurar Gmail API OAuth2
  - Crear proyecto en Google Cloud Console
  - Habilitar Gmail API
  - Crear credenciales OAuth2
  - Obtener refresh token
- [ ] Configurar Google Places API
  - Habilitar Places API
  - Crear API key
  - Configurar restricciones

#### Día 3-4: Workflow Principal
- [ ] Crear agente `Quotation Coordinator`
  - Orquesta todo el flujo
  - Usa Gmail tools
  - Usa guardrails
  - Actualiza base de datos
- [ ] Implementar job periódico
  - Cada 5 minutos: leer emails nuevos
  - Clasificar con guardrails
  - Crear quotation_requests si es handle

#### Día 5-7: Testing Manual
- [ ] Enviar email de prueba
- [ ] Verificar que se clasifica correctamente
- [ ] Verificar que se crea quotation_request
- [ ] Verificar que solicita info faltante
- [ ] Verificar que busca proveedores
- [ ] End-to-end test completo

### SEMANA 2: Features Críticos

#### Día 8-10: PDF/CAD Processing
- [ ] Implementar extracción de info de PDFs
  - Usar pdf-parse o PDF.js
  - Extraer texto
  - Detectar cantidades, materiales, tolerancias
- [ ] Implementar análisis básico de DXF
  - Usar dxf-parser
  - Extraer dimensiones
  - Detectar complejidad

#### Día 11-12: Provider Contact
- [ ] Implementar envío de emails a proveedores
- [ ] Crear templates profesionales
- [ ] Tracking de respuestas
- [ ] Parser de cotizaciones recibidas

#### Día 13-14: Dashboard para Humano
- [ ] Vista de quotation_requests pending
- [ ] Vista de información recopilada
- [ ] Vista de cotizaciones de proveedores
- [ ] Botón "Listo para presupuestar"

### SEMANA 3: Polish & Testing

#### Día 15-17: Refinamiento
- [ ] Mejorar prompts de agentes
- [ ] Añadir más guardrails
- [ ] Mejorar parsing de emails
- [ ] Optimizar búsqueda de proveedores

#### Día 18-19: Monitoring
- [ ] Setup Sentry (error tracking)
- [ ] Setup PostHog (analytics)
- [ ] Métricas clave:
  - Emails clasificados correctamente (%)
  - Tiempo de recopilación de info (horas)
  - Tasa de respuesta de proveedores (%)
  - Presupuestos completados (count)

#### Día 20-21: Beta Testing
- [ ] Seleccionar 2-3 solicitudes reales
- [ ] Monitorear comportamiento
- [ ] Recopilar feedback
- [ ] Iterar

### SEMANA 4: Deployment

#### Día 22-24: Producción
- [ ] Deploy a Vercel
- [ ] Configurar cron job para leer emails
- [ ] Configurar alertas
- [ ] Documentar proceso

#### Día 25-28: Handoff a Cliente
- [ ] Capacitar al equipo
- [ ] Documentar workflows
- [ ] Setup support
- [ ] Monitorear primeros días

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs Principales

1. **Tasa de Clasificación Correcta**
   - Target: > 95%
   - Emails clasificados correctamente como quotation_request vs otros

2. **Tiempo de Recopilación de Info**
   - Antes: 2-3 días
   - Target: < 3 horas
   - Métrica: tiempo desde email recibido hasta `ready_for_human`

3. **Completitud de Información**
   - Target: > 90%
   - % de quotation_requests con toda la info necesaria

4. **Tasa de Respuesta de Proveedores**
   - Target: > 70%
   - % de proveedores contactados que responden

5. **Satisfacción del Equipo Humano**
   - Target: > 4/5
   - "¿El agente te ahorra tiempo?"

### ROI Estimado

**Antes:**
- 10 solicitudes/semana
- 2 horas/solicitud de recopilación de info
- = 20 horas/semana de trabajo manual

**Después:**
- Mismo volumen
- 0.5 horas/solicitud (solo revisar lo que recopiló el agente)
- = 5 horas/semana de trabajo manual
- **Ahorro: 15 horas/semana = 75%**

**Valor económico:**
- Si 1 hora de trabajo = €30
- Ahorro semanal = 15h × €30 = €450
- Ahorro mensual = €1,800
- **Ahorro anual = €21,600**

---

## 🚨 RIESGOS Y MITIGACIONES

### Riesgo 1: Emails mal clasificados
**Impacto:** Alto - Responder incorrectamente a cliente
**Mitigación:**
- Threshold de confianza alto (75%)
- En caso de duda, escalar
- Logging completo de decisiones
- Revisión humana periódica

### Riesgo 2: Proveedores no responden
**Impacto:** Medio - Info incompleta para humano
**Mitigación:**
- Buscar múltiples proveedores (3-5)
- Tracking de response rate por proveedor
- Fallback a proveedores conocidos
- Timeout de 48 horas

### Riesgo 3: Extracción incorrecta de PDFs
**Impacto:** Medio - Info incorrecta al cliente
**Mitigación:**
- Siempre mostrar al humano para verificar
- Confidence scores en extracciones
- Solicitar confirmación al cliente
- Mejorar con feedback loop

### Riesgo 4: Gmail API rate limits
**Impacto:** Bajo - Sistema se ralentiza
**Mitigación:**
- Batch processing
- Caching
- Respetar rate limits (1 email/segundo)
- Exponential backoff

---

## 🎯 HITOS CLAVE

### Hito 1: MVP Funcional (Semana 3)
- ✅ Lee emails
- ✅ Clasifica correctamente
- ✅ Solicita info faltante
- ✅ Crea quotation_requests

### Hito 2: Provider Integration (Semana 4)
- ✅ Busca proveedores
- ✅ Contacta proveedores
- ✅ Recopila cotizaciones

### Hito 3: Beta con Cliente Real (Semana 6)
- ✅ 10 solicitudes procesadas
- ✅ Feedback positivo del equipo
- ✅ Ahorro de tiempo medible

### Hito 4: Producción (Semana 8)
- ✅ Deployment completo
- ✅ Monitoring activo
- ✅ 100% de emails procesados automáticamente

---

## 📞 SOPORTE Y SIGUIENTES PASOS

**Archivos creados:**
- ✅ `supabase/migrations/005_create_quotation_workflow.sql` - Schema de BD
- ✅ `lib/guardrails/email-classifier.ts` - Clasificador de emails
- ✅ `lib/tools/gmail.tools.ts` - Integración Gmail
- ✅ `lib/tools/provider-search.tools.ts` - Búsqueda de proveedores

**Próximo paso inmediato:**
```bash
# 1. Ejecutar migración de BD
cd supabase
# Copiar contenido de 005_create_quotation_workflow.sql
# Ejecutar en Supabase Dashboard → SQL Editor

# 2. Configurar Gmail API
# Seguir guía: https://developers.google.com/gmail/api/quickstart/nodejs

# 3. Configurar Google Places API
# Crear API key en: https://console.cloud.google.com/apis/credentials

# 4. Añadir variables de entorno
echo "
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GOOGLE_PLACES_API_KEY=...
" >> .env.local

# 5. Implementar Quotation Coordinator Agent
```

---

**🚀 El producto está bien diseñado. Ahora toca EJECUTAR.**
