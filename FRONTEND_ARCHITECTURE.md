# 🎯 Arquitectura del Frontend - Arkcutt AI Agent

## Problema Actual
- Tenemos toda la infraestructura de IA funcionando (clasificación, extracción, búsqueda de proveedores)
- Pero el frontend no muestra el valor real del producto
- El mercado no puede entender qué hace el sistema ni intervenir cuando necesita

## Solución: 3 Páginas Principales

### 1. 📦 ORDERS (Pedidos)
**Propósito:** Gestión de pedidos entrantes con automatización de atención al cliente

**Funcionalidades:**
- Lista de emails entrantes clasificados como pedidos
- Estado del pedido en tiempo real:
  - `pending` - Recién recibido
  - `gathering_info` - IA está recopilando información
  - `waiting_providers` - Buscando proveedores externos
  - `ready_for_human` - Listo para que el humano haga el presupuesto
  - `quoted` - Presupuesto enviado

- **Timeline de interacciones:**
  - Email original del cliente
  - Email de confirmación automático
  - Solicitudes de información adicional
  - Respuestas del cliente
  - Todo con timestamps

- **Datos técnicos extraídos:**
  - Material, cantidad, tolerancias, acabado
  - Archivos adjuntos (DXF, PDF, imágenes)
  - Información faltante destacada

- **Acciones del humano:**
  - Ver conversación completa
  - Enviar mensaje manual al cliente
  - Marcar como listo para cotizar
  - Crear presupuesto

**UI Components:**
- Cards con badges de estado
- Timeline vertical de actividad
- Modal detallado con toda la info
- Botones de acción contextual

---

### 2. 🔍 RFQs (Request for Quotations)
**Propósito:** Gestión de cotizaciones a proveedores externos

**Vista Principal:**
- Lista de servicios externos necesarios
- Agrupados por pedido de origen
- Estado de cada RFQ:
  - `searching` - IA buscando proveedores
  - `pending` - Proveedores encontrados, esperando aprobación
  - `sent` - Email enviado al proveedor
  - `received` - Respuesta del proveedor recibida
  - `expired` - Sin respuesta en X días

**Funcionalidad Automática:**
- IA identifica qué servicios no puede hacer Arkcutt
- Busca proveedores en base de datos + Google Places
- Genera email de solicitud de cotización
- Humano aprueba o rechaza antes de enviar

**Funcionalidad Manual:**
- **Búsqueda con prompt:**
  ```
  "Buscar empresas de anodizado en Madrid que trabajen con aluminio"
  ```
  - IA encuentra 5-10 proveedores
  - Muestra nombre, ubicación, contacto, rating
  - Genera email de solicitud personalizado
  - Humano edita si quiere y aprueba envío

- **Gestión de respuestas:**
  - Bandeja de entrada de respuestas de proveedores
  - IA extrae precio, tiempo de entrega
  - Compara opciones
  - Humano elige proveedor final

**UI Components:**
- Vista de tarjetas de proveedores
- Editor de email con preview
- Comparador de cotizaciones lado a lado
- Búsqueda conversacional con IA

---

### 3. ⚙️ CONFIGURATION (AI Playbook)
**Propósito:** Enseñar a la IA las capacidades de Arkcutt

**Secciones:**

#### 3.1 Servicios Internos
```yaml
Servicios que SÍ hacemos:
- Mecanizado CNC (aluminio, acero, plásticos)
- Corte láser
- Torneado
- Fresado
- Taladrado
```

#### 3.2 Servicios Externos (requieren proveedores)
```yaml
Servicios que NO hacemos:
- Anodizado
- Cromado
- Galvanizado
- Tratamientos térmicos
- Pintura industrial
- Materiales especiales (titanio, inconel)
```

#### 3.3 Capacidad y Stock
```yaml
Materiales en stock:
- Aluminio 6082: 500kg
- Acero inoxidable 304: 200kg
- Plástico PEEK: 50kg

Capacidad de producción:
- Piezas pequeñas (<100mm): 100/día
- Piezas medianas: 50/día
- Piezas grandes (>500mm): 10/día
```

#### 3.4 Reglas de Negocio
```yaml
Pedido mínimo: 50€
Tiempo de entrega estándar: 5-7 días
Descuento por volumen: >100 piezas = 10% off
Zonas de envío: Nacional gratuito, Internacional consultar
```

**UI Components:**
- Formularios estructurados
- Drag & drop para priorizar servicios
- Tablas editables de stock
- Preview en tiempo real de cómo afecta al agente

---

## Navegación Principal

```
┌─────────────────────────────────────────────────┐
│  Arkcutt AI Agent                    [Profile] │
├─────────────────────────────────────────────────┤
│  📦 Orders  |  🔍 RFQs  |  ⚙️ Config           │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Contenido de la página activa]                │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Flujo de Usuario

### Escenario 1: Pedido Nuevo (Totalmente Interno)
1. Email llega → Aparece en **Orders** como `pending`
2. IA analiza → Cambia a `gathering_info` si falta algo
3. IA envía email pidiendo info → Timeline muestra interacción
4. Cliente responde → IA extrae datos → `ready_for_human`
5. Humano crea presupuesto → `quoted`

### Escenario 2: Pedido con Servicio Externo
1. Email llega → **Orders** `pending`
2. IA detecta que necesita anodizado → `waiting_providers`
3. Aparece en **RFQs** nueva solicitud de anodizado
4. Humano ve proveedores sugeridos → Aprueba 3 de ellos
5. IA envía emails a proveedores → RFQ `sent`
6. Proveedores responden → RFQ `received`
7. Humano compara precios en RFQs → Elige uno
8. Pedido vuelve a **Orders** como `ready_for_human`
9. Humano hace presupuesto final con costo de anodizado incluido

### Escenario 3: Búsqueda Manual de Proveedor
1. Humano va a **RFQs**
2. Click en "Buscar Proveedor Manual"
3. Escribe: "Necesito soldadura TIG de acero inoxidable en Valencia"
4. IA busca → Muestra 8 empresas
5. Humano selecciona 2
6. IA genera email → Humano lo edita si quiere
7. Click "Enviar" → RFQ `sent`

---

## Tecnologías

- **Framework:** Next.js 14 (App Router)
- **UI:** shadcn/ui con tema mono/slate (ya configurado)
- **Estado:** React Context o Zustand
- **Real-time:** Supabase Realtime subscriptions
- **IA:** OpenAI GPT-4o para búsqueda conversacional

---

## Prioridades de Implementación

### Fase 1 (MVP Mejorado) - 2-3 días
- ✅ Rediseñar página Orders con timeline completa
- ✅ Añadir modal con detalles de pedido
- ✅ Mostrar estado del workflow claramente

### Fase 2 (RFQs Básico) - 3-4 días
- 🔲 Crear página RFQs
- 🔲 Lista de proveedores encontrados por IA
- 🔲 Aprobación humana antes de enviar
- 🔲 Vista de respuestas de proveedores

### Fase 3 (RFQs Avanzado) - 2-3 días
- 🔲 Búsqueda manual con prompt
- 🔲 Editor de emails
- 🔲 Comparador de cotizaciones

### Fase 4 (Configuration) - 2-3 días
- 🔲 Página de configuración
- 🔲 Formularios de servicios y capacidades
- 🔲 Gestión de stock
- 🔲 Reglas de negocio

---

## Métricas de Éxito

**Para el negocio:**
- Tiempo de respuesta a cliente: <5 min (automático)
- Tiempo de preparación de presupuesto: -60% (datos ya recopilados)
- Pedidos perdidos por falta de info: -80%
- Cobertura de servicios: +40% (con red de proveedores)

**Para el usuario:**
- Clicks para hacer un presupuesto: de 20+ a 3-5
- Visibilidad de pipeline: 100% tiempo real
- Control sobre IA: Aprobar/rechazar todas las acciones importantes

---

## Siguiente Paso

¿Empezamos con la **Fase 1** rediseñando la página Orders para que muestre realmente el valor del sistema?

O prefieres que primero arregle el bug técnico de las interacciones y luego pasamos al rediseño?
