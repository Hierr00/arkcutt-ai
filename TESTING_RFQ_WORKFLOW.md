# 📧 Guía de Testing: Workflow Completo de RFQs

Esta guía te ayudará a probar el workflow completo desde que llega un email hasta que se contacta a proveedores externos.

---

## 🎯 **OBJETIVO DEL TEST**

Verificar que cuando llega un email solicitando un servicio externo (ej: anodizado), el sistema:
1. ✅ Detecta automáticamente que necesita proveedor externo
2. ✅ Busca proveedores en Google Places
3. ✅ Les envía email solicitando cotización
4. ✅ Aparece en la página de RFQs para seguimiento

---

## 📋 **PASO 1: Configurar Servicios (Página de Settings)**

### 1.1 Aplicar la migración de BD
```bash
# Conectar a Supabase y ejecutar:
psql $DATABASE_URL -f supabase/migrations/007_create_company_settings.sql
```

### 1.2 Acceder a Settings
1. Ir a: `http://localhost:3000/settings`
2. Verificar que se cargan los servicios por defecto
3. **Revisar "External Services"** - debe incluir:
   - Anodizado
   - Cromado
   - Tratamiento Térmico
   - etc.

### 1.3 (Opcional) Personalizar servicios
- Añadir/eliminar servicios según tu negocio
- Click "Save Changes"

---

## 📧 **PASO 2: Enviar Email de Prueba**

### 2.1 Preparar email de prueba
Envía un email a la cuenta configurada en Gmail (la que tiene los tokens) con este contenido:

**Asunto:** Solicitud de presupuesto - Piezas de aluminio anodizado

**Cuerpo:**
```
Hola,

Necesito un presupuesto para mecanizar y anodizar 50 piezas de aluminio.

Especificaciones:
- Material: Aluminio 6061
- Cantidad: 50 unidades
- Dimensiones: 100x50x20mm
- Tolerancias: ±0.1mm
- Acabado: Anodizado negro

Archivo adjunto: plano.pdf (opcional)

Gracias,
Juan Pérez
juan@empresa.com
```

### 2.2 Datos clave del email
- ✅ **Menciona servicio externo**: "anodizado"
- ✅ **Tiene cantidad y material**: necesarios para RFQ
- ✅ **Es una solicitud clara**: no es spam

---

## 🤖 **PASO 3: Ejecutar el Cron Job (Procesamiento)**

### Opción A: Ejecutar manualmente (desarrollo)
```bash
curl -X POST http://localhost:3000/api/cron/process-emails \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json"
```

### Opción B: Esperar el cron automático (producción)
- El cron se ejecuta cada 5 minutos en Vercel
- Espera hasta 5 minutos después de enviar el email

---

## 🔍 **PASO 4: Verificar el Workflow**

### 4.1 Ver logs en terminal
Deberías ver algo como:
```
📬 Iniciando procesamiento de emails nuevos...
📧 Procesando 1 emails...
📊 Email de juan@empresa.com: handle (95% confianza)
📝 Creando quotation_request...
✅ Quotation request creado: uuid-123
✅ Email de confirmación enviado
🔍 Analizando información faltante...
🔎 Identificando servicios externos...
🔍 Servicios identificados: { externalServices: [{ service: "anodizado", ... }] }
📞 1 servicios externos detectados
🔍 Buscando proveedores para anodizado...
✅ Encontrados 5 proveedores para anodizado
📧 Contactando proveedor: Anodizados Madrid S.L.
✅ Cotización registrada para Anodizados Madrid S.L.
```

### 4.2 Verificar en el Dashboard
1. **Ir a** `http://localhost:3000/dashboard`
2. **Buscar la nueva orden**:
   - Estado: "Waiting Providers" o "Ready for Human"
   - Customer: juan@empresa.com
   - Description: "...anodizar 50 piezas..."

### 4.3 Verificar en RFQs
1. **Ir a** `http://localhost:3000/rfqs`
2. **Ver la pestaña "RFQs"**:
   - Debe aparecer 1+ RFQs
   - Estado: "Sent" o "Pending"
   - Provider: nombres de empresas de anodizado
   - Service: "anodizado"

### 4.4 Ver detalles del RFQ
1. Click en "View Details" en cualquier RFQ
2. Verificar:
   - ✅ Información del proveedor
   - ✅ Servicio solicitado (anodizado)
   - ✅ Linked a la orden del cliente
   - ✅ Formulario para registrar respuesta

---

## 📊 **PASO 5: Registrar Respuesta del Proveedor (Simulación)**

### 5.1 En el modal de detalles del RFQ:
1. Llenar formulario:
   - **Price**: 450 EUR
   - **Lead Time**: 5 days
   - **Notes**: "Anodizado negro, calidad aeronáutica"
2. Click "Mark as Received"

### 5.2 Verificar cambio de estado:
- El RFQ ahora debe estar en estado "Received"
- Aparece en el filtro "Received" del sidebar
- Muestra el precio y lead time

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Marca cada paso que funcione:

### Email Processing
- [ ] Email recibido y clasificado correctamente
- [ ] Quotation request creado en BD
- [ ] Email de confirmación enviado al cliente
- [ ] Información extraída correctamente (material, cantidad, etc.)

### Service Detection
- [ ] Sistema detecta que necesita servicio externo
- [ ] Usa configuración de Settings (no hardcoded)
- [ ] Identifica correctamente el servicio (anodizado)

### Provider Search
- [ ] Busca proveedores en Google Places
- [ ] Encuentra proveedores relevantes
- [ ] Crea registros en external_quotations

### Email to Providers
- [ ] Envía emails a proveedores (verificar Gmail Sent)
- [ ] Emails contienen información del pedido
- [ ] Emails profesionales y claros

### Frontend Display
- [ ] Orden aparece en Dashboard con estado correcto
- [ ] RFQs aparecen en página de RFQs
- [ ] Modal de detalles funciona
- [ ] Formulario de respuesta funciona

---

## 🐛 **TROUBLESHOOTING**

### Problema: No se procesan emails
**Solución:**
1. Verificar que Gmail tokens sean válidos:
   ```bash
   node scripts/list-gmail.js
   ```
2. Verificar que haya emails no leídos en inbox
3. Ver logs del cron job

### Problema: No detecta servicios externos
**Solución:**
1. Verificar configuración en `/settings`
2. Verificar que email mencione el servicio claramente
3. Ver logs del agente en terminal

### Problema: No encuentra proveedores
**Solución:**
1. Verificar `GOOGLE_PLACES_API_KEY` en `.env.local`
2. Verificar que servicio tenga nombre reconocible
3. Intentar con "anodizado madrid" directamente en Google

### Problema: RFQs no aparecen
**Solución:**
1. Verificar en Supabase que existen en `external_quotations`
2. Ver logs de API `/api/rfqs`
3. Refresh la página

---

## 🎯 **PRÓXIMOS PASOS DESPUÉS DEL TEST**

Una vez que todo funcione:

1. **Deploy a producción** (Vercel)
2. **Configurar cron real** (cada 5 minutos)
3. **Añadir más proveedores** en Settings
4. **Entrenar al equipo** sobre cómo usar el sistema

---

## 📝 **NOTAS IMPORTANTES**

- El sistema envía emails reales a proveedores - usa datos de prueba
- Los proveedores de Google Places son reales - ten cuidado con spam
- Puedes marcar emails como leídos para que no se reprocesen
- La configuración de Settings tiene caché de 5 minutos

---

## 🤝 **NECESITAS AYUDA?**

Si algo no funciona:
1. Revisa los logs en la terminal (`npm run dev`)
2. Verifica la BD en Supabase
3. Consulta `IMPLEMENTATION_STATUS.md` para ver el estado del sistema
