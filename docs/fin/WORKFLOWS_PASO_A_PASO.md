# 🎯 GUÍA COMPLETA: Workflows de Fin (Paso a Paso)

**Fecha:** 2025-11-01
**Versión:** 1.0
**Nivel:** Principiante → Avanzado

---

## 📚 TABLA DE CONTENIDOS

1. [Entendiendo Fin Workflows](#1-entendiendo-fin-workflows)
2. [Limitaciones de Fin](#2-limitaciones-de-fin)
3. [Arquitectura Modular (La Solución)](#3-arquitectura-modular)
4. [Custom Actions (Configuración)](#4-custom-actions-configuración)
5. [Workflow 1: Email Router](#5-workflow-1-email-router)
6. [Workflow 2: Quotation Handler](#6-workflow-2-quotation-handler)
7. [Troubleshooting](#7-troubleshooting)
8. [Testing](#8-testing)

---

## 1. ENTENDIENDO FIN WORKFLOWS

### ¿Qué es un Workflow en Fin?

Un **workflow** en Fin es una secuencia de pasos automatizados que se ejecutan cuando ocurre un **trigger** (evento).

```
TRIGGER (email llega)
    ↓
WORKFLOW ejecuta pasos
    ↓
ACCIÓN (responder, escalar, cerrar, etc.)
```

### Componentes Básicos

#### 1. **Triggers** (Disparadores)
- `conversation.user.created` - Cuando llega un email/mensaje nuevo
- `conversation.user.replied` - Cuando el usuario responde
- `conversation.admin.assigned` - Cuando se asigna a un admin
- Custom triggers

#### 2. **Steps** (Pasos)
- **Custom Actions** - Llamadas a APIs externas (tu backend)
- **Conditions** - If/else logic
- **Variables** - Almacenar datos
- **Messages** - Enviar mensajes al usuario
- **Tags** - Añadir etiquetas
- **Assignments** - Asignar conversación a equipo/persona

#### 3. **Actions** (Acciones finales)
- Cerrar conversación
- Asignar a humano
- Continuar a otro workflow
- Esperar respuesta del usuario

---

## 2. LIMITACIONES DE FIN

### ⚠️ Problemas Comunes

#### Limitación #1: Número de Pasos
**Problema:** Fin limita ~10-15 pasos por workflow (varía según plan)

**Síntoma:** No puedes añadir más pasos, botón "Add Step" deshabilitado

**Solución:** 🎯 **Workflows modulares** (varios workflows pequeños conectados)

#### Limitación #2: Complejidad de Lógica
**Problema:** Nested if/else profundos no funcionan bien

**Solución:** Usar Custom Actions para lógica compleja (delegar a tu API)

#### Limitación #3: Variables entre Workflows
**Problema:** No puedes pasar variables directamente entre workflows

**Solución:** Usar **Conversation Attributes** (campos custom en la conversación)

---

## 3. ARQUITECTURA MODULAR

### 🏗️ Sistema de Workflows Conectados

En lugar de un workflow gigante, creamos **4 workflows pequeños** que se conectan:

```
┌─────────────────────────────────────────────────────────────┐
│  WORKFLOW 1: Email Router (Principal)                      │
│  Trigger: conversation.user.created                         │
│  Función: Clasificar email y decidir qué hacer              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─→ Action = CONTINUE_WITH_FIN
                 │   └─→ Trigger WORKFLOW 2: Quotation Handler
                 │
                 ├─→ Action = CLOSE_AND_PROCESS_EXTERNALLY
                 │   └─→ Cerrar + webhook a backend
                 │
                 ├─→ Action = ESCALATE_TO_HUMAN
                 │   └─→ Asignar a equipo humano
                 │
                 └─→ Action = IGNORE
                     └─→ Cerrar silenciosamente

┌─────────────────────────────────────────────────────────────┐
│  WORKFLOW 2: Quotation Handler                              │
│  Trigger: conversation tagged "customer-inquiry"            │
│  Función: Recopilar datos técnicos del cliente              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 └─→ Datos completos
                     └─→ Trigger WORKFLOW 3: Create Quotation

┌─────────────────────────────────────────────────────────────┐
│  WORKFLOW 3: Create Quotation Request                       │
│  Trigger: conversation tagged "data-complete"               │
│  Función: Crear quotation_request en DB                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 └─→ Crear en DB + buscar proveedores

┌─────────────────────────────────────────────────────────────┐
│  WORKFLOW 4: Provider Management (Futuro)                   │
│  Trigger: webhook de proveedor                              │
│  Función: Gestionar respuestas de proveedores               │
└─────────────────────────────────────────────────────────────┘
```

### 💡 Cómo se Conectan

Los workflows se conectan usando **Tags** (etiquetas):

1. Workflow 1 añade tag `customer-inquiry`
2. Workflow 2 se dispara cuando ve tag `customer-inquiry`
3. Workflow 2 añade tag `data-complete`
4. Workflow 3 se dispara cuando ve tag `data-complete`

---

## 4. CUSTOM ACTIONS (CONFIGURACIÓN)

Antes de crear workflows, necesitamos configurar las **Custom Actions** (llamadas a tu API).

### 📍 Ubicación en Intercom

```
Intercom Dashboard
  → Settings (⚙️ abajo izquierda)
    → Fin
      → Custom Actions
        → + Create Custom Action
```

---

### 4.1. Custom Action #1: "Classify and Route Email"

Esta es la acción principal que clasifica emails.

#### Paso 1: Información Básica

Click en **"Create Custom Action"**

**Name:**
```
Classify and Route Email
```

**Description:**
```
Classifies incoming emails and determines routing: customer inquiry, provider response, spam, or escalate to human
```

**Internal note (opcional):**
```
Calls /api/fin/classify-and-route endpoint
Returns routing_decision and action to take
```

---

#### Paso 2: Request Configuration

**URL:**
```
https://arkcutt-ai-pi.vercel.app/api/fin/classify-and-route
```

**Method:**
```
POST
```

**Headers:**

Click **"+ Add Header"** (2 veces para añadir 2 headers)

| Header Name | Header Value |
|-------------|--------------|
| `Authorization` | `Bearer YOUR_FIN_API_TOKEN_HERE` |
| `Content-Type` | `application/json` |

⚠️ **IMPORTANTE:**
- En "Authorization", asegúrate que haya un **espacio** después de "Bearer"
- NO pongas comillas alrededor del token
- Copia y pega exactamente como está arriba

---

#### Paso 3: Request Body

Click en **"Request Body"** tab

Selecciona: **JSON**

Pega exactamente esto:

```json
{
  "from": "{{user.email}}",
  "subject": "{{conversation.subject}}",
  "body": "{{conversation.body}}",
  "thread_id": "{{conversation.id}}",
  "has_attachments": {{conversation.has_attachments}}
}
```

**Explicación de variables:**
- `{{user.email}}` - Email del usuario que envía
- `{{conversation.subject}}` - Asunto del email
- `{{conversation.body}}` - Cuerpo del mensaje
- `{{conversation.id}}` - ID único de la conversación
- `{{conversation.has_attachments}}` - Boolean (true/false)

⚠️ **Nota:** `has_attachments` NO lleva comillas porque es boolean

---

#### Paso 4: Response Mapping

Esta sección define qué variables de la respuesta de tu API quieres usar en el workflow.

Click **"+ Add Response Field"** (6 veces)

| Response Path | Variable Name | Type |
|---------------|---------------|------|
| `routing_decision` | `routing_decision` | String |
| `action` | `action` | String |
| `confidence` | `confidence` | Number |
| `reason` | `reason` | String |
| `automated_reply` | `automated_reply` | String (opcional) |
| `escalation_message` | `escalation_message` | String (opcional) |

**Response Path** = Nombre del campo en el JSON que devuelve tu API
**Variable Name** = Nombre que usarás en el workflow
**Type** = Tipo de dato

---

#### Paso 5: Test the Custom Action

Antes de guardar, HAZ UN TEST.

Click **"Test"** (botón arriba a la derecha)

**Test Input:**

Rellena los campos de prueba:

```
user.email: test@example.com
conversation.subject: Presupuesto mecanizado
conversation.body: Necesito 100 piezas en aluminio
conversation.id: test-conv-123
conversation.has_attachments: false
```

Click **"Run Test"**

**Resultado esperado:**

```json
{
  "routing_decision": "CUSTOMER_INQUIRY",
  "action": "CONTINUE_WITH_FIN",
  "confidence": 0.85,
  "reason": "quotation_keywords_detected",
  ...
}
```

✅ Si ves esto → Click **"Save"**

❌ Si da error → Revisa:
- Headers (especialmente Authorization)
- URL correcta
- Body JSON válido

---

### 4.2. Custom Action #2: "Create Quotation Request" (Opcional - Para después)

Esta la crearemos más adelante. Por ahora enfócate en la primera.

---

## 5. WORKFLOW 1: EMAIL ROUTER

Este es el workflow PRINCIPAL. Se ejecuta cuando llega un email nuevo.

### 📍 Ubicación

```
Intercom Dashboard
  → Fin
    → Workflows
      → + Create Workflow
```

---

### Configuración del Workflow

#### Paso 1: Información Básica

**Workflow Name:**
```
Email Router
```

**Description:**
```
Classifies incoming emails and routes them to the appropriate handler (Fin, external system, or human)
```

**Status:** Activo (toggle ON)

---

#### Paso 2: Trigger Configuration

**Trigger:** Selecciona `When a conversation is created`

Esto se dispara cuando:
- Llega un email nuevo
- Usuario inicia chat por primera vez

**Conditions (filtros):**

Añade un filtro para que SOLO se ejecute en emails (no chat web):

Click **"+ Add Condition"**

```
Conversation source → is → Email
```

Esto evita que se ejecute en chats del website.

---

#### Paso 3: Steps (Pasos del Workflow)

Ahora vamos a añadir los pasos. Este workflow tendrá **4-5 pasos máximo**.

---

##### STEP 1: Call Custom Action "Classify and Route Email"

Click **"+ Add Step"**

**Step Type:** Custom Action

**Select Action:** "Classify and Route Email" (la que creamos antes)

**Input Values:**

Aquí Fin automáticamente llenará los campos porque usamos variables de conversación:
- `user.email` → Se llena automáticamente del usuario
- `conversation.subject` → Se llena automáticamente
- `conversation.body` → Se llena automáticamente
- Etc.

**Save Step Output As:**

Dale un nombre a la variable donde se guardará la respuesta:

```
classification
```

Ahora puedes usar:
- `{{classification.routing_decision}}`
- `{{classification.action}}`
- `{{classification.confidence}}`
- Etc.

Click **"Save Step"**

---

##### STEP 2: Branch - Check Action

Ahora necesitamos hacer diferentes cosas según el `action` que devolvió la API.

Click **"+ Add Step"**

**Step Type:** Branch (Condition)

**Condition:**

```
{{classification.action}} equals "CONTINUE_WITH_FIN"
```

**If TRUE (Then):**
- Continuar al siguiente step

**If FALSE (Else):**
- Ir a otro branch

Click **"Save Step"**

---

##### STEP 3A: If CONTINUE_WITH_FIN → Tag and Trigger Next Workflow

Este paso se ejecuta si `action = "CONTINUE_WITH_FIN"` (es un cliente).

Click **"+ Add Step"** (dentro del branch TRUE)

**Step Type:** Add Tag

**Tag:**
```
customer-inquiry
```

✅ Esto dispara el Workflow 2 (que veremos después)

**También añade otro step:**

Click **"+ Add Step"**

**Step Type:** Set Conversation Attribute

**Attribute Name:** `email_context`
**Attribute Value:** `{{classification.context}}`

Esto guarda el contexto (si es cliente existente, etc.) para usarlo después.

Click **"Save Step"**

**Mensaje al usuario (opcional):**

Puedes añadir un paso para enviar un mensaje de confirmación:

Click **"+ Add Step"**

**Step Type:** Send Message

**Message:**
```
¡Gracias por contactarnos! Voy a ayudarte con tu solicitud de presupuesto.
```

---

##### STEP 3B: If NOT "CONTINUE_WITH_FIN" → Check Other Actions

Vuelve al Step 2 (el Branch) y en la parte **ELSE**, añade otro branch:

Click **"+ Add Step"** (en la rama ELSE)

**Step Type:** Branch

**Condition:**
```
{{classification.action}} equals "CLOSE_AND_PROCESS_EXTERNALLY"
```

**If TRUE:**

Es una respuesta de proveedor. Hacemos:

1. **Send Message:**
   ```
   {{classification.automated_reply}}
   ```

2. **Add Tag:** `provider-response`

3. **Close Conversation**

4. **(Opcional) Call Webhook:**
   - URL: `https://arkcutt-ai-pi.vercel.app/api/providers/process-response`
   - Method: POST
   - Body:
     ```json
     {
       "conversation_id": "{{conversation.id}}",
       "from": "{{user.email}}",
       "subject": "{{conversation.subject}}",
       "body": "{{conversation.body}}"
     }
     ```

---

##### STEP 3C: If ESCALATE_TO_HUMAN

En el ELSE del branch anterior, añade otro branch:

**Condition:**
```
{{classification.action}} equals "ESCALATE_TO_HUMAN"
```

**If TRUE:**

1. **Send Message:**
   ```
   {{classification.escalation_message}}
   ```

2. **Assign to Team:**
   - Team: "Support" o "Human Review" (crea este equipo primero)

3. **Add Tag:** `needs-human-attention`

4. **Set Priority:**
   - Si `{{classification.confidence}}` < 0.5 → Priority: HIGH
   - Si no → Priority: NORMAL

---

##### STEP 3D: If IGNORE (Spam o Out of Scope)

En el último ELSE:

**Condition:**
```
{{classification.action}} equals "IGNORE"
```

**If TRUE:**

1. **Add Tag:** `spam-or-out-of-scope`

2. **Close Conversation** (sin mensaje)

---

### Paso 4: Guardar Workflow

Una vez terminado, click **"Save Workflow"**

Luego, toggle **"Active"** para activarlo.

---

## 6. WORKFLOW 2: QUOTATION HANDLER

Este workflow se ejecuta cuando el Workflow 1 añade el tag `customer-inquiry`.

### Configuración

#### Paso 1: Información Básica

**Name:** Quotation Handler

**Description:** Collects technical data from customer for quotation

---

#### Paso 2: Trigger

**Trigger:** `When a tag is added to a conversation`

**Conditions:**

```
Tag added → is → customer-inquiry
```

---

#### Paso 3: Steps

Este workflow tiene la conversación con el cliente para recopilar datos.

##### STEP 1: Greet and Ask for Material

**Step Type:** Send Message

**Message:**
```
Perfecto, voy a ayudarte con tu cotización.

Para darte un presupuesto preciso, necesito algunos datos:

1️⃣ **Material específico**: ¿Qué tipo de material necesitas? (Ej: Aluminio 6061, Acero inoxidable 304, etc.)

2️⃣ **Cantidad**: ¿Cuántas piezas necesitas?

3️⃣ **Acabado superficial**: ¿Necesitas algún tratamiento? (anodizado, pintura, crudo, etc.)

Puedes responder con toda la información que tengas.
```

---

##### STEP 2: Wait for User Response

**Step Type:** Wait for User Reply

**Timeout:** 48 hours

Si el usuario no responde en 48h, puedes enviar un recordatorio o cerrar.

---

##### STEP 3: Parse User Response (Usando Custom Action)

Aquí deberías crear otra Custom Action que llame a un endpoint tuyo que extraiga los datos del mensaje del usuario.

**PERO** para empezar simple, puedes hacer esto manualmente con Fin:

**Step Type:** Extract Information

Fin puede extraer automáticamente:
- Material mentioned
- Quantity mentioned
- Finish mentioned

Y guardarlo en variables.

---

##### STEP 4: Check if Complete

**Step Type:** Branch

**Condition:** Check si tienes todos los datos necesarios

Si **complete** → Tag `data-complete` → Trigger Workflow 3

Si **incomplete** → Pedir datos faltantes → Volver a Step 2

---

### ⚠️ IMPORTANTE: Límite de Pasos

Si llegas al límite de pasos en este workflow, puedes:

**Opción A:** Dividir en más workflows
- Workflow 2A: Pedir material y cantidad
- Workflow 2B: Pedir acabado y plazo
- Workflow 2C: Confirmar datos

**Opción B:** Simplificar
- Pedir todos los datos en un solo mensaje
- User responde
- Si falta algo, pedir solo eso

---

## 7. TROUBLESHOOTING

### Problema: "Can't add more steps"

**Causa:** Límite de pasos alcanzado

**Solución:**
1. Dividir en workflows más pequeños
2. Usar tags para conectarlos
3. Mover lógica compleja a Custom Actions (tu API)

---

### Problema: "Custom Action fails with 401"

**Causa:** Token incorrecto o middleware bloqueando

**Solución:**
1. Verifica que `/api/fin` esté en publicApiRoutes del middleware ✅
2. Verifica token en Custom Action (sin comillas, con espacio después de "Bearer")
3. Verifica variable `FIN_API_TOKEN` en Vercel

---

### Problema: "Variables not passing between workflows"

**Causa:** Workflows no comparten variables directamente

**Solución:** Usar **Conversation Attributes**

En Workflow 1:
```
Set Conversation Attribute:
  Name: routing_info
  Value: {{classification}}
```

En Workflow 2:
```
Get Conversation Attribute:
  Name: routing_info
```

---

### Problema: "Workflow not triggering"

**Causa:** Conditions incorrectas o trigger mal configurado

**Solución:**
1. Verifica que el trigger esté activo
2. Verifica conditions (source = Email, etc.)
3. Verifica tags (exactamente iguales, case-sensitive)
4. Mira logs en Intercom → Activity

---

## 8. TESTING

### Test Completo del Sistema

#### 1. Test con Email de Debug

Envía un email a tu inbox de Intercom:

```
From: test@example.com
Subject: Presupuesto mecanizado CNC
Body: Necesito 100 piezas en aluminio 6061. Adjunto planos.
Attachment: plano_test.pdf
```

#### 2. Verifica en Intercom

Ve a Inbox y mira la conversación:

✅ Debe tener tag `customer-inquiry`
✅ Debe haber enviado mensaje de bienvenida
✅ Debe pedir datos técnicos

#### 3. Verifica en Vercel Logs

Ve a Vercel → Functions → Logs

Busca:
```
POST /api/fin/classify-and-route
Status: 200
```

#### 4. Verifica en Supabase (si aplicaste migración)

```sql
SELECT * FROM routing_logs
ORDER BY created_at DESC
LIMIT 10;
```

Debe haber un registro con:
- `routing_decision = 'CUSTOMER_INQUIRY'`
- `action = 'CONTINUE_WITH_FIN'`
- `confidence > 0.8`

---

## 📝 RESUMEN RÁPIDO

### Para Empezar AHORA MISMO:

**Paso 1:** Crea Custom Action "Classify and Route Email"
- URL: `https://arkcutt-ai-pi.vercel.app/api/fin/classify-and-route`
- Headers: Authorization + Content-Type
- Test que funcione

**Paso 2:** Crea Workflow "Email Router" (simple)
- Trigger: conversation created
- Step 1: Call Custom Action
- Step 2: If action = "CONTINUE_WITH_FIN" → Tag `customer-inquiry`
- Step 3: If action = "ESCALATE_TO_HUMAN" → Assign to team
- Step 4: Else → Close conversation

**Paso 3:** Test con email real

**Paso 4:** Añade complejidad gradualmente

---

## 🎯 Siguiente Paso

Cuando hayas configurado el Email Router básico y funcione, me avisas y te ayudo con:

1. Workflow 2 (Quotation Handler) detallado
2. Custom Action para extraer datos técnicos
3. Workflow 3 para crear quotation_request en DB
4. Optimizaciones avanzadas

---

**¿Preguntas? Problemas? Avísame en qué paso estás y te ayudo específicamente.**
