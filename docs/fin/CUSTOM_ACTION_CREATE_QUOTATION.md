# 📝 Custom Action: Crear Quotation Request

Este documento explica cómo configurar el **Custom Action** en Fin que dispara la búsqueda de proveedores y creación de RFQs cuando Fin recopila toda la información necesaria del cliente.

---

## 🎯 Objetivo

Cuando Fin ha recopilado toda la información de una solicitud de cotización (material, cantidad, servicios, especificaciones), debe llamar a este Custom Action para:

1. ✅ Crear un `quotation_request` en la base de datos
2. ✅ Clasificar servicios internos vs externos
3. ✅ Buscar proveedores para servicios externos
4. ✅ Enviar RFQs automáticamente
5. ✅ Responder al cliente con confirmación y tiempos estimados

---

## 📋 Configuración en Intercom

### PASO 1: Crear Custom Action

```
Intercom → Settings (⚙️) → Fin → Custom Actions → "+ Create Custom Action"
```

### PASO 2: Información Básica

```
Name: Create Quotation Request
Description: Creates a quotation request and initiates provider search and RFQ sending
```

### PASO 3: Request Configuration

#### URL
```
https://arkcutt-ai-pi.vercel.app/api/fin/create-quotation-request
```

#### Method
```
POST
```

#### Headers

Click "+ Add Header" dos veces:

**Header 1:**
```
Name: Authorization
Value: Bearer YOUR_FIN_API_TOKEN_HERE
```

⚠️ Reemplaza `YOUR_FIN_API_TOKEN_HERE` con tu token real de Fin (el que configuraste en `.env.local` como `FIN_API_TOKEN`)

**Header 2:**
```
Name: Content-Type
Value: application/json
```

⚠️ **IMPORTANTE:** Asegúrate que hay un ESPACIO después de "Bearer"

#### Body

Selecciona: **JSON**

Pega esto:

```json
{
  "customer_email": "{{user.email}}",
  "customer_name": "{{user.name}}",
  "customer_company": "{{conversation.custom_attribute.company_name}}",
  "parts_description": "{{conversation.custom_attribute.parts_description}}",
  "quantity": {{conversation.custom_attribute.quantity}},
  "material_requested": "{{conversation.custom_attribute.material}}",
  "services": {{conversation.custom_attribute.services_array}},
  "tolerances": "{{conversation.custom_attribute.tolerances}}",
  "surface_finish": "{{conversation.custom_attribute.surface_finish}}",
  "delivery_deadline": "{{conversation.custom_attribute.deadline}}",
  "conversation_id": "{{conversation.id}}",
  "thread_id": "{{conversation.thread_id}}"
}
```

⚠️ **NOTA:** Los campos entre `{{ }}` son variables de Intercom que Fin debe completar antes de llamar a este Action.

### PASO 4: Response Mapping

Click "+ Map response field" 5 veces:

```
Field 1:
  Response path: success
  Variable name: success

Field 2:
  Response path: quotation_request_id
  Variable name: quotation_id

Field 3:
  Response path: customer_message
  Variable name: customer_message

Field 4:
  Response path: estimated_response_time
  Variable name: estimated_time

Field 5:
  Response path: services_breakdown
  Variable name: services_info
```

### PASO 5: Test

Click "Test" arriba a la derecha.

Rellena con datos de ejemplo:

```
user.email: test@example.com
user.name: Juan Pérez
conversation.custom_attribute.company_name: Test Industries
conversation.custom_attribute.parts_description: Pieza cilíndrica con tolerancias estrictas
conversation.custom_attribute.quantity: 100
conversation.custom_attribute.material: Aluminio 6061
conversation.custom_attribute.services_array: [{"service_type": "mecanizado_cnc"}, {"service_type": "anodizado"}]
conversation.custom_attribute.tolerances: ±0.05mm
conversation.custom_attribute.surface_finish: Ra 1.6
conversation.custom_attribute.deadline: 2025-12-15
conversation.id: test-conv-123
conversation.thread_id: thread-456
```

Click "Run Test"

✅ **Debe mostrar:**
```json
{
  "success": true,
  "quotation_request_id": "uuid-here",
  "customer_message": "¡Perfecto! He enviado tu solicitud a 3 proveedores especializados...",
  "estimated_response_time": "2-3 días laborables",
  "services_breakdown": {
    "internal_services": ["mecanizado_cnc"],
    "external_services": [
      {
        "service": "anodizado",
        "providers_found": 5,
        "rfqs_sent": 3
      }
    ]
  }
}
```

Si funciona → Click "Save"

---

## 🔄 Integración con Workflow de Fin

### Workflow Recomendado

El Custom Action debe llamarse cuando Fin ha recopilado **TODA** la información necesaria:

```
Workflow: Quotation Request Handler
├─ Step 1: Ask for material
│   └─ Save to conversation.custom_attribute.material
├─ Step 2: Ask for quantity
│   └─ Save to conversation.custom_attribute.quantity
├─ Step 3: Ask for services needed
│   └─ Save to conversation.custom_attribute.services_array
├─ Step 4: Ask for technical specs (optional)
│   ├─ Save tolerances → conversation.custom_attribute.tolerances
│   └─ Save surface finish → conversation.custom_attribute.surface_finish
├─ Step 5: Ask for description
│   └─ Save to conversation.custom_attribute.parts_description
├─ Step 6: Ask for deadline (optional)
│   └─ Save to conversation.custom_attribute.deadline
│
├─ Step 7: ✨ Call Custom Action "Create Quotation Request"
│   └─ Save output as "quotation_result"
│
└─ Step 8: Send confirmation to customer
    └─ Message: "{{quotation_result.customer_message}}"
```

### Condiciones para Ejecutar el Custom Action

El Custom Action **SOLO** debe ejecutarse si:
- ✅ Material está definido
- ✅ Cantidad está definida
- ✅ Al menos un servicio está definido
- ✅ Descripción de piezas está definida

En Fin, puedes configurar una condición:

```
IF (
  conversation.custom_attribute.material IS NOT EMPTY
  AND conversation.custom_attribute.quantity > 0
  AND conversation.custom_attribute.services_array IS NOT EMPTY
  AND conversation.custom_attribute.parts_description IS NOT EMPTY
)
THEN
  → Call Custom Action "Create Quotation Request"
ELSE
  → Continue asking for missing information
```

---

## 📊 Campos de Conversación Necesarios

Para que este Custom Action funcione, Fin debe guardar información en **Custom Attributes** de la conversación:

### Crear Custom Attributes en Intercom

```
Intercom → Settings → Data → Conversation Data
→ "+ Create new attribute"
```

Crear los siguientes attributes:

| Attribute Name | Type | Description |
|----------------|------|-------------|
| `material` | String | Material solicitado (ej: "Aluminio 6061") |
| `quantity` | Number | Cantidad de piezas |
| `services_array` | JSON | Array de servicios: `[{"service_type": "mecanizado_cnc"}]` |
| `parts_description` | String | Descripción de las piezas |
| `tolerances` | String | Tolerancias (opcional) |
| `surface_finish` | String | Acabado superficial (opcional) |
| `deadline` | String | Fecha límite (formato: YYYY-MM-DD) |
| `company_name` | String | Nombre de la empresa del cliente |

---

## 🧪 Testing del Flujo Completo

### Test desde PowerShell

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_FIN_API_TOKEN_HERE"
    "Content-Type" = "application/json"
}

$body = @{
    customer_email = "test@example.com"
    customer_name = "Juan Pérez"
    customer_company = "Test Industries"
    parts_description = "Piezas cilíndricas mecanizadas en CNC con anodizado negro"
    quantity = 100
    material_requested = "Aluminio 6061"
    services = @(
        @{ service_type = "mecanizado_cnc" },
        @{ service_type = "anodizado" }
    )
    tolerances = "±0.05mm"
    surface_finish = "Ra 1.6"
    delivery_deadline = "2025-12-15"
    conversation_id = "test-conv-123"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "https://arkcutt-ai-pi.vercel.app/api/fin/create-quotation-request" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

### Verificar Resultados

1. **En Supabase:**
   ```sql
   -- Ver quotation request creado
   SELECT * FROM quotation_requests ORDER BY created_at DESC LIMIT 1;

   -- Ver RFQs enviados
   SELECT * FROM external_quotations WHERE quotation_request_id = 'uuid-aquí';
   ```

2. **En Gmail:**
   - Verifica que se enviaron emails a los proveedores
   - Subject: "Solicitud de Cotización - anodizado - Aluminio 6061"

3. **En Intercom:**
   - La conversación debe tener el mensaje de confirmación
   - Los custom attributes deben estar guardados

---

## ⚠️ Troubleshooting

### Error: "Validation error"

**Causa:** Algún campo requerido falta o tiene formato incorrecto.

**Solución:**
- Verifica que `customer_email` sea un email válido
- Verifica que `quantity` sea un número entero positivo
- Verifica que `services` sea un array con al menos un elemento

### Error: "No providers found"

**Causa:** No se encontraron proveedores para el servicio solicitado.

**Solución:**
- Revisa que el nombre del servicio esté correcto (ej: "anodizado" no "anodado")
- Revisa logs en Vercel para ver qué búsquedas se hicieron
- Considera añadir proveedores manualmente a `provider_contacts`

### Error: "Email sending failed"

**Causa:** Gmail API no pudo enviar el email.

**Solución:**
- Verifica que las credenciales de Gmail estén configuradas
- Revisa logs de Gmail API
- El quotation request y external_quotation se crean igual, solo falla el envío

---

## 🎯 Próximos Pasos

Una vez configurado este Custom Action:

1. ✅ Configura el workflow en Fin que recopila la información
2. ✅ Añade el paso para llamar a este Custom Action
3. ✅ Configura el mensaje de confirmación usando `{{quotation_result.customer_message}}`
4. ✅ Testa con conversaciones reales en Intercom

**Siguiente:** Configurar el endpoint para procesar respuestas de proveedores → Ver `PROVIDERS_AGENT_OSS.md`
