# Dashboard Improvements - Orders Page

## Resumen de Cambios

Se ha rediseñado completamente la página de Orders (Dashboard) con una estructura de **sidebar** en lugar de tabs horizontales, mejorando la navegación y priorizando correctamente los pedidos según su estado e importancia.

---

## Estructura de Navegación (Sidebar)

### **Active Orders** (Pedidos Activos - PRIORIDAD ALTA)
Esta es la sección principal donde se muestra la actividad de la IA.

1. **All Active** - Vista combinada de todos los pedidos en los que la IA está trabajando
   - `ready_for_human` - Requiere acción humana inmediata
   - `gathering_info` - IA recopilando información
   - `waiting_providers` - IA buscando proveedores

2. **Ready for Quote** ⚠️ - **MÁXIMA PRIORIDAD**
   - Pedidos listos para cotización humana
   - Badge verde destacado
   - Vista por defecto recomendada

3. **Gathering Info** 🔍 (indentado)
   - IA está recopilando información faltante del cliente
   - Badge azul

4. **Finding Providers** 📈 (indentado)
   - IA está buscando proveedores externos
   - Badge amarillo

### **Other** (Otras Categorías)

5. **Needs Review** ⏱️
   - Estado `pending` - Requiere revisión inicial
   - Puede que no sean pedidos reales
   - **NO debe ser la vista predeterminada**

6. **Completed** ✅
   - Estado `quoted` - Pedidos ya cotizados
   - Histórico de éxitos

7. **Rejected & Spam** ❌
   - Estados `rejected` y `spam` combinados
   - Pedidos descartados

8. **All Orders** 📧
   - Vista completa de todos los pedidos

---

## Mejoras Visuales en las Cards

### Badges con Iconos
Cada estado ahora tiene un icono visual y color específico:

- 🟢 **Ready for Quote** - Verde (acción requerida)
- 🔵 **Gathering Info** - Azul (en proceso)
- 🟡 **Finding Providers** - Amarillo (buscando)
- ⚪ **Needs Review** - Gris (pendiente)
- 🟣 **Quoted** - Púrpura (completado)
- 🔴 **Rejected** - Rojo (rechazado)

### Información Mejorada en Cards

1. **Header con contexto**
   - Badge de estado con icono
   - Tiempo relativo (3m ago, 2h ago, 5d ago)
   - Porcentaje de confianza de la IA

2. **Información del cliente**
   - Nombre (destacado)
   - Email
   - Empresa (si disponible)

3. **Descripción de partes**
   - Fondo destacado con mejor legibilidad

4. **Detalles técnicos**
   - Material
   - Cantidad

5. **Información faltante**
   - Badges individuales para cada campo faltante
   - Destacado visual en amarillo

6. **Análisis de IA**
   - Flags y análisis del agente
   - Badges secundarios

---

## Priorización de Vistas

### Vista Predeterminada: **Active Orders**
La vista por defecto es "All Active" que muestra:
- Ready for Quote (requiere acción)
- Gathering Info (IA trabajando)
- Finding Providers (IA buscando)

### ¿Por qué NO empezar con "All Orders" o "Pending"?

1. **Pending** puede incluir spam o no-pedidos que la IA aún no clasificó
2. **All Orders** muestra demasiada información irrelevante
3. **Active Orders** muestra solo donde hay valor y actividad de la IA

### Orden de Importancia

```
1. Ready for Quote     ← Requiere acción humana INMEDIATA
2. Gathering Info      ← IA trabajando activamente
3. Waiting Providers   ← IA buscando recursos
4. Needs Review        ← Puede que no sea pedido real
5. Completed           ← Ya procesados
6. Rejected/Spam       ← Descartados
```

---

## API Updates

### Nuevos Query Parameters

```typescript
GET /api/quotations?type=all&status=ready_for_human
```

**Parámetros:**
- `type`: `all` | `handled` | `escalated` (legacy)
- `status`:
  - Específico: `ready_for_human`, `gathering_info`, `waiting_providers`, `pending`, `quoted`
  - Combinados: `active`, `rejected_all`

### Ejemplos de Uso

```javascript
// Todos los pedidos activos
fetch('/api/quotations?status=active')

// Solo ready for quote
fetch('/api/quotations?status=ready_for_human')

// Rejected y spam combinados
fetch('/api/quotations?status=rejected_all')

// Todos sin filtro
fetch('/api/quotations?type=all')
```

---

## Stats Bar Contextual

Según la vista seleccionada, se muestran estadísticas relevantes:

### Vista "Active Orders"
- **Total**: Cantidad de pedidos activos
- **Needs Action**: Cuántos ready_for_human
- **In Progress**: gathering_info + waiting_providers

### Otras Vistas
- **Total**: Cantidad en esa categoría

---

## Contadores en Tiempo Real

Cada categoría del sidebar muestra:
- Badge con número de pedidos
- Se actualiza cada 30 segundos automáticamente
- Badge destacado cuando la vista está activa

---

## Mejoras de UX

1. **Sidebar fijo** - Navegación siempre visible
2. **Indentación visual** - Jerarquía clara (All Active > subcategorías)
3. **Estados activos/inactivos** - Contraste visual claro
4. **Responsive stats** - Información contextual según vista
5. **Empty states** - Mensajes específicos por categoría
6. **Hover effects** - Feedback visual en cards y botones

---

## Arquitectura de Componentes

```
Dashboard
├── LayoutNavigation (top nav)
├── Sidebar
│   ├── Active Orders Section
│   │   ├── All Active
│   │   ├── Ready for Quote (indent)
│   │   ├── Gathering Info (indent)
│   │   └── Finding Providers (indent)
│   └── Other Section
│       ├── Needs Review
│       ├── Completed
│       ├── Rejected & Spam
│       └── All Orders
├── Main Content
│   ├── Header + Stats
│   └── Orders List (Cards)
└── QuotationDetailModal

```

---

## Estados del Sistema

```typescript
type ViewType =
  | 'active'              // Todos los activos
  | 'ready_for_human'     // Solo ready
  | 'gathering_info'      // Solo gathering
  | 'waiting_providers'   // Solo waiting
  | 'needs_review'        // Solo pending
  | 'completed'           // Solo quoted
  | 'rejected'            // Rejected + Spam
  | 'all';                // Todos
```

---

## Próximas Mejoras Sugeridas

1. **Filtros adicionales**
   - Por cliente
   - Por fecha
   - Por material

2. **Búsqueda**
   - Búsqueda por email/nombre/empresa
   - Búsqueda por descripción de parte

3. **Acciones en masa**
   - Marcar múltiples como revisados
   - Exportar lista

4. **Notificaciones**
   - Sonido cuando llega "Ready for Quote"
   - Contador de nuevos pedidos

5. **Vista de calendario**
   - Ver pedidos por fecha de entrega
   - Timeline de actividad

---

## Instalación de Dependencias

```bash
npm install lucide-react @radix-ui/react-icons
```

## Archivos Modificados

- `app/dashboard/page.tsx` - Componente principal rediseñado
- `app/api/quotations/route.ts` - API mejorada con nuevos filtros
- `package.json` - Nuevas dependencias agregadas

---

**Resultado Final**: Una interfaz clara, priorizada y enfocada en mostrar donde la IA está generando valor, facilitando la toma de decisiones del humano.
