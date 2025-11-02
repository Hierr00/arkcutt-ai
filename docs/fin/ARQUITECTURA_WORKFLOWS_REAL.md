# 🏗️ Arquitectura Real de Workflows en Fin para Arkcutt

Esta guía explica EXACTAMENTE cómo configurar Fin basándose en la UI real de Intercom.

---

## 🎯 OPCIÓN RECOMENDADA: Arquitectura Simple (Sin classify-and-route)

**Por qué simple:** Si entrenas bien a Fin, él mismo puede identificar qué tipo de mensaje es y responder adecuadamente. NO necesitas classify-and-route en el workflow.

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    GMAIL INBOX                               │
│               ventas@arkcutt.com                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  INTERCOM INBOX                              │
│          (emails se forwardean aquí)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   FIN AI (Training)                          │
│  - Identifica si es solicitud de cotización                  │
│  - Filtra spam automáticamente                               │
│  - Responde preguntas generales                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
             ¿Es solicitud de cotización?
                         │
                    ┌────┴────┐
                    │   SÍ    │
                    └────┬────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│         WORKFLOW: "Quotation Request Handler"               │
│                                                              │
│  Trigger: Fin AI detects "quotation request" intent         │
│                                                              │
│  Steps:                                                      │
│  1. Fin AI: Ask for material                                │
│  2. Fin AI: Ask for quantity                                │
│  3. Fin AI: Ask for services needed                         │
│  4. Fin AI: Ask for parts description                       │
│  5. Fin AI: Ask for technical specs (optional)              │
│                                                              │
│  6. Custom Action: "Create Quotation Request"               │
│     → Calls /api/fin/create-quotation-request               │
│     → Creates quotation_request in DB                       │
│     → Searches providers                                    │
│     → Sends RFQs                                            │
│                                                              │
│  7. Fin AI: Send confirmation message                       │
│     → Uses {{result.customer_message}}                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 CONFIGURACIÓN PASO A PASO (UI Real)

### PARTE 1: Entrenar a Fin (CRÍTICO)

**Ubicación:** Intercom → Fin → Content → Add content

#### 1.1. Añadir Conocimiento Base

Crea un documento de conocimiento interno:

**Nombre:** "Servicios de Arkcutt"

**Contenido:**
```markdown
# Servicios de Arkcutt

Arkcutt es una empresa especializada en **mecanizado CNC de metales de alta precisión**.

## Servicios que REALIZAMOS internamente:
- Mecanizado CNC (fresado, torneado, taladrado)
- Fabricación de piezas metálicas en aluminio, acero, titanio
- Prototipos y series cortas/medias
- Mecanizado de precisión con tolerancias estrictas

## Servicios que NO realizamos (subcontratamos):
- Anodizado
- Cromado
- Tratamientos térmicos
- Pintura
- Soldadura
- Corte láser

## Proceso de Cotización:
Cuando un cliente solicita una cotización, necesitamos:
1. Material (ej: Aluminio 6061, Acero 304)
2. Cantidad de piezas
3. Servicios requeridos (mecanizado, anodizado, etc.)
4. Descripción de las piezas
5. Tolerancias (opcional)
6. Acabado superficial (opcional)
7. Plazo de entrega deseado (opcional)

Cuando tengamos toda esta información, crearemos la solicitud de cotización y buscaremos proveedores para los servicios externos.
```

**Guardar** → Esto entrena a Fin para saber qué preguntar.

#### 1.2. Añadir FAQs

**Pregunta:** "¿Qué servicios ofrecen?"
**Respuesta:** "Somos especialistas en mecanizado CNC de metales. Fabricamos piezas en aluminio, acero y titanio con tolerancias muy estrictas. Para servicios como anodizado o cromado, trabajamos con proveedores especializados."

**Pregunta:** "¿Cuánto tiempo tarda una cotización?"
**Respuesta:** "Normalmente respondemos en 24 horas para servicios internos. Si requieres servicios externos (anodizado, tratamientos), puede tardar 2-3 días mientras esperamos respuestas de proveedores."

**Pregunta:** "¿Hacen anodizado?"
**Respuesta:** "No realizamos anodizado internamente, pero trabajamos con proveedores especializados. Nosotros coordinamos todo el proceso para que tú solo tengas que hablar con Arkcutt."

---

### PARTE 2: Configurar Custom Actions

Ya tienes documentado cómo crear estas Custom Actions en:
- `docs/fin/CUSTOM_ACTION_CREATE_QUOTATION.md` (para create-quotation-request)
- `docs/fin/WORKFLOW_SIMPLE_START.md` (para classify-and-route)

**Acciones a crear:**

1. **Custom Action: "Create Quotation Request"**
   - URL: `/api/fin/create-quotation-request`
   - Seguir guía en `CUSTOM_ACTION_CREATE_QUOTATION.md`

2. ~~Custom Action: "Classify Email"~~ ← **NO necesaria** en este flujo

---

### PARTE 3: Configurar Workflow (UI Real)

#### Ubicación: Intercom → Fin → Workflows → "+ New Workflow"

#### Configuración del Workflow

**Name:** `Quotation Request Handler`

**Description:** `Handles quotation requests from customers`

**Status:** `Active` ✅

---

#### TRIGGER (Cuándo se activa)

En la UI verás algo como:

```
┌─────────────────────────────────────────┐
│  When should this workflow run?         │
│                                          │
│  ○ When a conversation is created       │
│  ○ When a message is received           │
│  ● When Fin detects intent              │ ← SELECCIONA ESTO
└─────────────────────────────────────────┘
```

**Selecciona:** "When Fin detects intent"

**Intent:** "Customer wants a quotation" o "Solicitud de cotización"

⚠️ **Si no existe esta opción en tu plan**, usa:
- Trigger: "When a conversation is created"
- Condition: "Message contains keywords" → presupuesto, cotización, mecanizado, piezas

---

#### CONDITIONS (Condiciones adicionales)

```
┌─────────────────────────────────────────┐
│  Run this workflow when:                │
│                                          │
│  ✅ User email exists                   │
│  ✅ Message is inbound (not outbound)   │
│  ☐ Conversation status is open          │
└─────────────────────────────────────────┘
```

---

#### STEPS (Pasos del Workflow)

Aquí es donde configuras los pasos. La UI debería verse así:

```
┌──────────────────────────────────────────────────────────┐
│  Workflow Steps                                          │
│  ─────────────────────────────────────────────────────   │
│                                                           │
│  Step 1: Fin AI Response                                 │
│  Step 2: Fin AI Response                                 │
│  Step 3: Fin AI Response                                 │
│  Step 4: Fin AI Response                                 │
│  Step 5: Fin AI Response                                 │
│  Step 6: Run Custom Action                               │
│  Step 7: Fin AI Response                                 │
│                                                           │
│  [+ Add Step]                                            │
└──────────────────────────────────────────────────────────┘
```

**Configuración de cada paso:**

##### Step 1: Greet and Understand Request
```
Type: Fin AI Response
Action: Let Fin respond naturally

Instructions for Fin:
"Saluda al cliente y confirma que has entendido que necesita una cotización.
Pregúntale qué tipo de piezas necesita y para qué aplicación."

Save response to: (dejar vacío)
```

##### Step 2: Ask for Material
```
Type: Fin AI Response

Instructions for Fin:
"Pregunta al cliente qué material necesita para las piezas.
Ejemplos: Aluminio 6061, Acero 304, Titanio Grade 5, etc.
Si no está seguro, ayúdale sugiriendo materiales comunes."

Wait for user reply: YES ✅

Save reply to conversation attribute: "material"
```

##### Step 3: Ask for Quantity
```
Type: Fin AI Response

Instructions for Fin:
"Pregunta cuántas piezas necesita fabricar.
Acepta tanto prototipos (1-10 unidades) como series (100+)."

Wait for user reply: YES ✅

Save reply to conversation attribute: "quantity"
```

##### Step 4: Ask for Services
```
Type: Fin AI Response

Instructions for Fin:
"Pregunta qué servicios necesita:
- Solo mecanizado CNC
- Mecanizado + anodizado
- Mecanizado + otros tratamientos

Explica que Arkcutt hace el mecanizado y coordina servicios externos si necesita."

Wait for user reply: YES ✅

Save reply to conversation attribute: "services_raw"
```

##### Step 5: Ask for Description
```
Type: Fin AI Response

Instructions for Fin:
"Pide una descripción de las piezas. Si tiene planos o archivos adjuntos, indícale que puede adjuntarlos."

Wait for user reply: YES ✅

Save reply to conversation attribute: "description"
```

##### Step 6: Create Quotation Request (Custom Action)
```
Type: Run Custom Action
Action: "Create Quotation Request"

Input mapping:
  customer_email: {{user.email}}
  customer_name: {{user.name}}
  parts_description: {{conversation.description}}
  quantity: {{conversation.quantity}}
  material_requested: {{conversation.material}}
  services: Parse from {{conversation.services_raw}}
  conversation_id: {{conversation.id}}

Save output as: "quotation_result"
```

⚠️ **PROBLEMA:** Fin no puede parsear `services_raw` a array automáticamente.

**SOLUCIÓN:** Necesitas un paso intermedio o simplificar.

**Opción A (Simple):** En lugar de array, envía string:
```json
{
  "services": [{"service_type": "{{conversation.services_raw}}"}]
}
```

**Opción B (Mejor):** Añade un paso previo donde Fin estrutura los servicios:

```
Step 5.5: Structure Services
Type: Fin AI Response

Instructions:
"Basándote en los servicios que mencionó el cliente, lista SOLO los nombres de servicios separados por coma.
Ejemplos:
- Si dijo 'mecanizado y anodizado' → responde: mecanizado_cnc, anodizado
- Si dijo 'solo fresado' → responde: mecanizado_cnc
- Si dijo 'mecanizado, pintura y cromado' → responde: mecanizado_cnc, pintura, cromado"

Save to: "services_structured"
```

Luego en el Custom Action, envías:
```
services: {{conversation.services_structured}}
```

##### Step 7: Send Confirmation
```
Type: Fin AI Response

Instructions for Fin:
"Usa el mensaje de confirmación del resultado:
{{quotation_result.customer_message}}

Añade que puede contactarte si tiene dudas o necesita modificar algo."
```

---

### PARTE 4: Configurar Conversation Attributes

**Ubicación:** Intercom → Settings → Messenger → Conversations → Custom Attributes

Crear estos attributes:

| Name | Type | Description |
|------|------|-------------|
| `material` | Text | Material solicitado |
| `quantity` | Number | Cantidad de piezas |
| `services_raw` | Text | Servicios mencionados por cliente |
| `services_structured` | Text | Servicios en formato parseable |
| `description` | Text | Descripción de piezas |
| `tolerances` | Text | Tolerancias (opcional) |
| `surface_finish` | Text | Acabado superficial (opcional) |

---

## 🧪 TESTING

### Test 1: Conversación Manual

1. Envía un email a tu inbox de Intercom:
```
Subject: Solicitud de cotización
Body: Hola, necesito mecanizar 100 piezas en aluminio con anodizado negro.
```

2. Ve a Intercom Inbox → Abre la conversación

3. Fin debería:
   - Saludar
   - Preguntar material (aunque ya lo dijiste, debe confirmar)
   - Preguntar cantidad
   - Preguntar servicios
   - Preguntar descripción
   - Llamar al Custom Action
   - Responder con confirmación

4. Verifica en Supabase:
```sql
SELECT * FROM quotation_requests ORDER BY created_at DESC LIMIT 1;
SELECT * FROM external_quotations WHERE quotation_request_id = '...';
```

### Test 2: Ver Logs

Intercom → Fin → Activity → busca tu conversación

Verás:
- Qué pasos del workflow se ejecutaron
- Si el Custom Action se llamó correctamente
- Errores si los hubo

---

## ⚠️ TROUBLESHOOTING

### Problema: "Workflow not triggering"

**Causa:** Trigger mal configurado o Fin no detecta intent

**Solución:**
1. Cambia trigger a "When message is received"
2. Añade condition: "Message contains" → presupuesto OR cotización OR mecanizado
3. Asegúrate Status = Active

### Problema: "Custom Action fails"

**Causa:** Variables no están definidas

**Solución:**
1. Verifica que cada `conversation.attribute` existe
2. Test el Custom Action manualmente desde Intercom
3. Mira logs en Vercel

### Problema: "Fin doesn't ask all questions"

**Causa:** Workflow steps mal configurados

**Solución:**
1. Asegúrate "Wait for reply" está activado en cada paso
2. Verifica que "Save to attribute" está configurado
3. Prueba cada paso individualmente

---

## 📊 Flujo Completo Visualizado

```
Email llega: "Necesito 100 piezas de aluminio mecanizadas y anodizadas"
                                    ↓
                     Intercom recibe el email
                                    ↓
                    Fin AI (con training) lee el email
                                    ↓
                Detecta: "Es solicitud de cotización"
                                    ↓
          ┌───────────────────────────────────────────┐
          │  WORKFLOW: Quotation Request Handler      │
          └───────────────────────────────────────────┘
                                    ↓
              Fin: "¡Hola! Veo que necesitas una cotización.
                    ¿Qué material necesitas?"
                                    ↓
              Cliente: "Aluminio 6061"
              → Save to conversation.material
                                    ↓
              Fin: "¿Cuántas piezas?"
                                    ↓
              Cliente: "100"
              → Save to conversation.quantity
                                    ↓
              Fin: "¿Qué servicios? ¿Solo mecanizado o también acabados?"
                                    ↓
              Cliente: "Mecanizado y anodizado negro"
              → Save to conversation.services_raw
                                    ↓
              Fin: "Cuéntame más sobre las piezas"
                                    ↓
              Cliente: "Son piezas cilíndricas de 50mm diámetro"
              → Save to conversation.description
                                    ↓
         ┌──────────────────────────────────────────────────┐
         │  CUSTOM ACTION: Create Quotation Request         │
         │  POST /api/fin/create-quotation-request          │
         │                                                   │
         │  Input:                                           │
         │  - customer_email: cliente@example.com            │
         │  - material: Aluminio 6061                        │
         │  - quantity: 100                                  │
         │  - services: mecanizado_cnc, anodizado            │
         │  - description: Piezas cilíndricas 50mm           │
         │                                                   │
         │  Proceso:                                         │
         │  1. Crea quotation_request en DB                  │
         │  2. Clasifica servicios (interno vs externo)      │
         │  3. Busca proveedores de anodizado                │
         │  4. Envía RFQs a 3 proveedores                    │
         │                                                   │
         │  Output:                                          │
         │  {                                                │
         │    "customer_message": "¡Perfecto! He enviado..."│
         │    "estimated_time": "2-3 días"                   │
         │  }                                                │
         └──────────────────────────────────────────────────┘
                                    ↓
              Fin: "¡Perfecto! He enviado tu solicitud a 3
                    proveedores especializados en anodizado.
                    Te responderemos en 2-3 días laborables."
```

---

## 🎯 Próximo Paso

Una vez tengas este workflow funcionando, el siguiente paso es manejar las **respuestas de los proveedores**:

1. Proveedor responde al RFQ
2. Email llega a Gmail
3. Se detecta que es respuesta de proveedor
4. Agente OSS procesa la respuesta (extrae precio, plazo, etc.)
5. Se actualiza la quotation en DB
6. Se notifica al cliente cuando hay suficientes cotizaciones

Pero primero, configura esto y dime cómo te va! 🚀
