# Dashboard - Diseño Visual

## Layout General

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LayoutNavigation (Top Bar)                                              │
│ [Logo] Dashboard | RFQs | Providers                            [User]   │
└─────────────────────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────────────────────────────┐
│                  │                                                      │
│   SIDEBAR        │              MAIN CONTENT                            │
│   (w-64)         │              (flex-1)                                │
│                  │                                                      │
│ Active Orders    │  ┌──────────────────────────────────────────────┐   │
│ ┌──────────────┐ │  │ Header: Active Orders                        │   │
│ │🔥 All Active │ │  │ Orders where the AI is actively working      │   │
│ │     [12]     │ │  └──────────────────────────────────────────────┘   │
│ └──────────────┘ │                                                      │
│   ⚠️  Ready (5)  │  ┌──────────────────────────────────────────────┐   │
│   🔍 Gathering(4)│  │ Stats Bar                                     │   │
│   📈 Finding (3) │  │ Total: 12  | Needs Action: 5 | In Progress: 7│   │
│                  │  └──────────────────────────────────────────────┘   │
│ Other            │                                                      │
│ ⏱️  Needs Rev(8) │  ┌──────────────────────────────────────────────┐   │
│ ✅ Completed(25)│  │ ORDER CARD                                    │   │
│ ❌ Rejected (15)│  │ [🟢 Ready for Quote] 2h ago [95% confidence] │   │
│ 📧 All Orders(60)│  │                                               │   │
│                  │  │ John Smith                                    │   │
│                  │  │ john@company.com                              │   │
│                  │  │ ABC Manufacturing                             │   │
│                  │  │                                               │   │
│                  │  │ ┌───────────────────────────────────────┐    │   │
│                  │  │ │ Parts Description                     │    │   │
│                  │  │ │ Aluminum brackets with custom holes   │    │   │
│                  │  │ └───────────────────────────────────────┘    │   │
│                  │  │                                               │   │
│                  │  │ Material: Aluminum 7075  |  Quantity: 100    │   │
│                  │  │                                               │   │
│                  │  │ [View Details] [Create Quote]                │   │
│                  │  └──────────────────────────────────────────────┘   │
│                  │                                                      │
│                  │  ┌──────────────────────────────────────────────┐   │
│                  │  │ ORDER CARD                                    │   │
│                  │  │ [🔵 Gathering Info] 5m ago                   │   │
│                  │  │ ...                                           │   │
│                  │  └──────────────────────────────────────────────┘   │
│                  │                                                      │
└──────────────────┴──────────────────────────────────────────────────────┘
```

---

## Sidebar - Estructura Jerárquica

```
┌─────────────────────────────┐
│   ACTIVE ORDERS             │  ← Section Header
├─────────────────────────────┤
│ 🔥 All Active        [12]   │  ← Main Category (bold)
│   ⚠️  Ready for Quote  [5]  │  ← Subcategory (indented)
│   🔍 Gathering Info    [4]  │  ← Subcategory (indented)
│   📈 Finding Providers [3]  │  ← Subcategory (indented)
├─────────────────────────────┤
│   OTHER                     │  ← Section Header
├─────────────────────────────┤
│ ⏱️  Needs Review      [8]   │
│ ✅ Completed         [25]   │
│ ❌ Rejected & Spam   [15]   │
│ 📧 All Orders        [60]   │
└─────────────────────────────┘
```

**Estados Visuales:**
- **Activo**: Fondo azul, texto blanco
- **Hover**: Fondo gris claro
- **Inactivo**: Texto gris

---

## Order Card - Estados y Colores

### 1. Ready for Quote (PRIORIDAD MÁXIMA)

```
┌─────────────────────────────────────────────────────────────┐
│ [🟢 Ready for Quote] 2h ago [95% confidence]                │
│                                                              │
│ ███ John Smith                                              │
│ john@company.com                                            │
│ ABC Manufacturing Inc.                                      │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Parts Description                                    │    │
│ │ CNC machined aluminum brackets with threaded holes  │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ Material: Aluminum 7075    |    Quantity: 100 units         │
│                                                              │
│ ⚠️  Missing Information:                                     │
│ [Technical Drawing] [Surface Finish] [Delivery Date]        │
│                                                              │
│                    [View Details] [Create Quote ✓]          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Gathering Info (IA TRABAJANDO)

```
┌─────────────────────────────────────────────────────────────┐
│ [🔵 Gathering Info] 15m ago [87% confidence]                │
│                                                              │
│ Maria Garcia                                                │
│ maria@techparts.es                                          │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Parts Description                                    │    │
│ │ Steel components for industrial machinery            │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ Material: Not specified    |    Quantity: 50                │
│                                                              │
│ ⚠️  Missing Information:                                     │
│ [Material Type] [Tolerances] [Quantity]                     │
│                                                              │
│ 🤖 AI Flags: [missing_critical_info] [awaiting_customer]    │
│                                                              │
│                              [View Details]                  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Finding Providers (BUSCANDO RECURSOS)

```
┌─────────────────────────────────────────────────────────────┐
│ [🟡 Finding Providers] 30m ago [92% confidence]             │
│                                                              │
│ Carlos López                                                │
│ carlos@metalworks.com                                       │
│ MetalWorks S.L.                                             │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Parts Description                                    │    │
│ │ Anodized aluminum parts                              │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ Material: Aluminum 6061    |    Quantity: 200               │
│                                                              │
│ 🔍 External Services Needed:                                │
│ [Anodizing - Black] [Surface Treatment]                     │
│                                                              │
│ 🤖 AI Status: Searching for anodizing providers...          │
│                                                              │
│                              [View Details]                  │
└─────────────────────────────────────────────────────────────┘
```

### 4. Needs Review (PENDIENTE)

```
┌─────────────────────────────────────────────────────────────┐
│ [⚪ Needs Review] 5d ago [45% confidence]                   │
│                                                              │
│ spam@randommail.com                                         │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Parts Description                                    │    │
│ │ General inquiry about services                       │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ 🤖 AI Flags: [low_confidence] [possible_spam]               │
│                                                              │
│                              [View Details]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Header Contextual - Stats Bar

### Vista: Active Orders
```
┌────────────────────────────────────────────────────────────┐
│ Active Orders                                              │
│ Orders where the AI is actively working                    │
│                                                            │
│ Total     │  Needs Action  │  In Progress                 │
│   12      │       5        │      7                       │
└────────────────────────────────────────────────────────────┘
```

### Vista: Ready for Quote
```
┌────────────────────────────────────────────────────────────┐
│ Ready for Quote                                            │
│ Orders ready for human quotation                           │
│                                                            │
│ Total: 5                                                   │
└────────────────────────────────────────────────────────────┘
```

---

## Modal de Detalles

```
┌───────────────────────────────────────────────────────────────┐
│ Quotation Details                          john@company.com   │
│                                                       [Close]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │ AI ANALYSIS         │  │ ACTIVITY TIMELINE            │   │
│  │                     │  │                              │   │
│  │ Confidence: 95%     │  │ ●─┐ Email Received          │   │
│  │ Classification:     │  │ │ │ 2h ago                   │   │
│  │   Quotation Request │  │ │ │ Customer inquiry...      │   │
│  │                     │  │ │ │                          │   │
│  │ AI Reasoning:       │  │ │ │                          │   │
│  │ High confidence     │  │ ●─┘ Info Request Sent       │   │
│  │ quotation request   │  │ │   30m ago                  │   │
│  │ with clear specs    │  │ │   AI requested material... │   │
│  │                     │  │ │                            │   │
│  ├─────────────────────┤  │ ●─  Info Provided           │   │
│  │ CUSTOMER INFO       │  │     15m ago                  │   │
│  │                     │  │     Customer confirmed...    │   │
│  │ Name: John Smith    │  │                              │   │
│  │ Email: john@...     │  └──────────────────────────────┘   │
│  │ Company: ABC Mfg    │                                     │
│  │                     │                                     │
│  ├─────────────────────┤                                     │
│  │ PART SPECS          │                                     │
│  │                     │                                     │
│  │ Desc: Aluminum...   │                                     │
│  │ Material: AL 7075   │                                     │
│  │ Qty: 100            │                                     │
│  │                     │                                     │
│  ├─────────────────────┤                                     │
│  │ EXTERNAL PROVIDERS  │                                     │
│  │                     │                                     │
│  │ ┌─────────────────┐ │                                     │
│  │ │ Anodizing Corp  │ │                                     │
│  │ │ Anodizing       │ │                                     │
│  │ │ [sent]          │ │                                     │
│  │ └─────────────────┘ │                                     │
│  └─────────────────────┘                                     │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ [Create Quotation] [View Email Thread] [View Attachments]    │
└───────────────────────────────────────────────────────────────┘
```

---

## Paleta de Colores

### Estados
- 🟢 **Green** (#10b981): Ready for Quote - Acción requerida
- 🔵 **Blue** (#3b82f6): Gathering Info - AI trabajando
- 🟡 **Yellow** (#f59e0b): Finding Providers - Búsqueda activa
- ⚪ **Gray** (#64748b): Needs Review - Pendiente
- 🟣 **Purple** (#a855f7): Quoted - Completado
- 🔴 **Red** (#ef4444): Rejected - Descartado

### UI Elements
- **Background**: #fafafa (muted/5)
- **Cards**: #ffffff (white)
- **Borders**: #e5e7eb (border)
- **Text Primary**: #111827 (foreground)
- **Text Secondary**: #6b7280 (muted-foreground)

---

## Iconografía (lucide-react)

- `TrendingUp` - Active/Growing
- `AlertCircle` - Needs attention
- `Search` - Searching/Gathering
- `Clock` - Pending/Waiting
- `CheckCircle2` - Completed
- `XCircle` - Rejected
- `Mail` - General/All
- `FileCheck` - Quoted

---

## Responsive Behavior

### Desktop (>1024px)
- Sidebar: 256px fijo
- Main content: flex-1
- Cards: Full width con max-width

### Tablet (768px - 1024px)
- Sidebar: Colapsable
- Main content: Full width
- Cards: Compactas

### Mobile (<768px)
- Sidebar: Drawer/Bottom sheet
- Main content: Stack vertical
- Cards: Formato móvil

---

**Resultado**: Una interfaz clara, profesional y enfocada en la productividad del usuario humano supervisando el trabajo de la IA.
