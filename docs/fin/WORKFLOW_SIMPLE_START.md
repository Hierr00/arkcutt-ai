# 🚀 QUICK START: Tu Primer Workflow en Fin (15 minutos)

Si quieres empezar YA y no leer toda la guía extensa, sigue estos pasos.

---

## ⏱️ VERSION SIMPLE (Para probar que funciona)

Vamos a crear el workflow MÁS SIMPLE posible, solo para validar que todo funciona.

---

## PASO 1: Custom Action (5 minutos)

### 1.1. Ir a Custom Actions

```
Intercom
  → Click en ⚙️ (Settings) abajo izquierda
    → Fin
      → Custom Actions (en el menú izquierdo)
        → Click "Create Custom Action"
```

### 1.2. Rellenar el formulario

**Sección: Basic Info**

```
Name: Classify Email
Description: Classifies incoming emails
```

**Sección: Request**

```
URL: https://arkcutt-ai-pi.vercel.app/api/fin/classify-and-route
Method: POST
```

**Sección: Headers**

Click "+ Add Header" dos veces:

```
Header 1:
  Name: Authorization
  Value: Bearer YOUR_FIN_API_TOKEN_HERE

Header 2:
  Name: Content-Type
  Value: application/json
```

⚠️ **CRÍTICO:** En Authorization, asegúrate que hay un ESPACIO después de "Bearer"

**Sección: Body**

Selecciona: "JSON"

Pega esto:

```json
{
  "from": "{{user.email}}",
  "subject": "{{conversation.subject}}",
  "body": "{{conversation.body}}",
  "thread_id": "{{conversation.id}}",
  "has_attachments": false
}
```

⚠️ Por ahora dejamos `has_attachments: false` para simplificar.

**Sección: Response**

Click "+ Map response field" 3 veces:

```
Field 1:
  Response path: action
  Variable name: action

Field 2:
  Response path: routing_decision
  Variable name: routing_decision

Field 3:
  Response path: automated_reply
  Variable name: automated_reply
```

### 1.3. Test

Click botón "Test" arriba a la derecha.

Rellena:

```
user.email: test@example.com
conversation.subject: Presupuesto
conversation.body: Necesito 100 piezas
conversation.id: test-123
```

Click "Run Test"

✅ **Debe mostrar:**
```json
{
  "action": "CUSTOMER_INQUIRY" o "UNCERTAIN",
  "routing_decision": ...,
  ...
}
```

Si funciona → Click "Save"

---

## PASO 2: Workflow Simple (5 minutos)

### 2.1. Crear Workflow

```
Intercom
  → Fin
    → Workflows
      → "+ Create Workflow"
```

### 2.2. Configuración Básica

```
Name: Email Router Simple
Description: Routes emails automatically
Status: Active (toggle ON)
```

### 2.3. Trigger

```
Trigger: When a conversation is created
```

NO añadas condiciones por ahora (para que funcione con todo).

### 2.4. Steps

#### Step 1: Call API

Click "+ Add Step"

```
Step type: Custom Action
Action: Classify Email (la que creamos antes)
Save output as: result
```

Click "Save Step"

#### Step 2: Log Result (Para Debug)

Click "+ Add Step"

```
Step type: Add Tag
Tag: routing-{{result.action}}
```

Esto añadirá un tag como "routing-CUSTOMER_INQUIRY" o "routing-UNCERTAIN" para que veas qué decidió.

Click "Save Step"

#### Step 3: Mensaje Simple

Click "+ Add Step"

```
Step type: Send Message
Message:
Gracias por contactarnos. He clasificado tu mensaje como: {{result.routing_decision}}

Un miembro del equipo te responderá pronto.
```

Click "Save Step"

### 2.5. Guardar y Activar

Click "Save Workflow" arriba a la derecha.

Asegúrate que el toggle "Active" esté ON (verde).

---

## PASO 3: Test (5 minutos)

### 3.1. Enviar Email de Prueba

Opción A: **Desde tu email personal**

Envía un email a tu inbox de Intercom (ej: `tu-workspace@intercom-mail.com`)

```
Subject: Presupuesto para mecanizado
Body:
Hola,

Necesito cotización para 100 piezas en aluminio 6061.

Gracias
```

Opción B: **Desde Intercom Test**

1. Ve a Inbox
2. Click "+ New" (nuevo mensaje)
3. Simula un usuario escribiendo

### 3.2. Verificar Resultado

Ve a Intercom → Inbox → Abre la conversación

Deberías ver:

✅ Tag añadido: ej `routing-CUSTOMER_INQUIRY`
✅ Mensaje automático enviado
✅ Conversación clasificada

### 3.3. Ver Logs (Opcional)

Ve a Vercel → tu proyecto → Functions → Logs

Busca:
```
POST /api/fin/classify-and-route
```

Deberías ver status 200.

---

## ✅ Si Todo Funciona

¡Perfecto! Ahora tienes:
- ✅ Custom Action funcionando
- ✅ Workflow básico ejecutándose
- ✅ Clasificación automática de emails

---

## ⚠️ Si Algo Falla

### Error: "Custom Action failed"

**Test 1:** Abre en navegador:
```
https://arkcutt-ai-pi.vercel.app/api/fin/debug
```

Debe mostrar:
```json
{
  "status": "Debug endpoint is working",
  "env_token_exists": true
}
```

Si esto falla → El problema está en Vercel (variable no configurada o deployment no actualizado)

**Test 2:** Test desde PowerShell:

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_FIN_API_TOKEN_HERE"
    "Content-Type" = "application/json"
}
$body = @{
    from = "test@test.com"
    subject = "Test"
    body = "Test"
    thread_id = "123"
    has_attachments = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://arkcutt-ai-pi.vercel.app/api/fin/classify-and-route" -Method Post -Headers $headers -Body $body
```

Si funciona → El problema está en la configuración del Custom Action en Fin (headers, body, etc.)

### Error: "Workflow not running"

1. Verifica que el workflow esté **Active** (toggle verde)
2. Verifica que el **trigger** sea correcto
3. Ve a Intercom → Settings → Fin → Activity logs
4. Busca tu conversación, debería aparecer qué workflows se ejecutaron

---

## 🎯 Próximos Pasos

Una vez que esto funcione, puedes mejorar:

### Mejora 1: Añadir Branches

En lugar de solo poner un tag, haz diferentes acciones según `result.action`:

```
If result.action = "ESCALATE_TO_HUMAN"
  → Assign to team "Support"

If result.action = "IGNORE"
  → Close conversation

Else
  → Continue
```

### Mejora 2: Segundo Workflow

Crea otro workflow que se dispare cuando se añade tag `routing-CUSTOMER_INQUIRY`:

```
Trigger: When tag is added
Condition: Tag = "routing-CUSTOMER_INQUIRY"

Steps:
  1. Send: "Voy a ayudarte con tu presupuesto..."
  2. Ask: "¿Qué material necesitas?"
  3. Wait for reply
  4. Etc.
```

### Mejora 3: Conversation Attributes

Guarda información en la conversación para usarla después:

```
Step: Set Conversation Attribute
  Name: classification_result
  Value: {{result}}
```

Luego en otro workflow:

```
Get Conversation Attribute: classification_result
```

---

## 📞 Ayuda

Si te atascas en algún paso específico, dime:
1. En qué paso estás (1, 2 o 3)
2. Qué error exacto ves (screenshot si es posible)
3. Qué has probado ya

Y te ayudo a resolverlo.

---

**¡Suerte! En 15 minutos deberías tener tu primer workflow funcionando.**
