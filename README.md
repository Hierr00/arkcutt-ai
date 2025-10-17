# 🏭 Arkcutt AI - Sistema de Presupuestos Industriales

Sistema multi-agente determinista para gestión de solicitudes de presupuesto en empresa de mecanizado industrial (CNC, fresado, torneado) construido con **Mastra AI**.

## 🎯 Características Clave

- **✅ 100% Determinista**: Workflows predecibles con routing basado en reglas explícitas
- **📊 Auditoría Completa**: Trazabilidad de cada decisión (ISO 9001 ready)
- **🤖 Multi-Agente**: Agentes especializados (Material, Proveedores, Ingeniería)
- **💾 Memoria Persistente**: Sistema de memoria nativo con vector search
- **🛡️ Guardrails**: Validaciones técnicas robustas
- **📈 Observabilidad**: Métricas y monitoring integrado

## 🏗️ Arquitectura

```
Cliente (Next.js UI)
    ↓
Main Workflow (Determinista)
    ↓
Intent Classification (Reglas + LLM)
    ↓
Routing (IF/ELSE estricto)
    ↓
Agentes Especializados
    ↓
Tools & Memory
    ↓
Supabase (Persistencia)
```

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js >= 18
- npm >= 9
- Cuenta de OpenAI
- Cuenta de Supabase

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
arkcutt-ai-mastra/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── chat/         # Endpoint principal
│   └── page.tsx          # UI principal
├── mastra/                # 🆕 Directorio Mastra AI
│   ├── index.ts          # Instancia principal
│   ├── workflows/        # Workflows deterministas
│   ├── agents/           # Agentes especializados
│   ├── tools/            # Herramientas
│   └── memory/           # Sistema de memoria
├── lib/                   # Utilities
├── components/           # React Components
├── types/                # TypeScript Types
├── supabase/             # Database Migrations
└── tests/                # Testing
```

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests con UI
npm run test:ui

# Coverage
npm run test:coverage
```

## 🔧 Configuración de Supabase

1. Crear nuevo proyecto en [Supabase](https://supabase.com)
2. Ejecutar migrations en `supabase/migrations/`
3. Configurar variables de entorno

## 📚 Documentación

- [Mastra AI Docs](https://docs.mastra.ai)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)

## 🎯 Agentes Especializados

1. **Material Agent**: Especialista en materiales industriales (aceros, aluminios, plásticos)
2. **Proveedores Agent**: Especialista en servicios externos (tratamientos, soldaduras)
3. **Ingeniería Agent**: Gestión de presupuestos y validación técnica

## 📈 Métricas de Éxito

- ✅ 98%+ routing correcto
- ✅ < 5s tiempo de respuesta
- ✅ 95%+ confidence en clasificación
- ✅ 100% trazabilidad

## 🛠️ Stack Tecnológico

- **Framework**: Mastra AI v0.1.x
- **Frontend**: Next.js 15 + React 19
- **Database**: Supabase (PostgreSQL + Vector Store)
- **LLM**: OpenAI (GPT-4o, GPT-4o-mini)
- **Validation**: Zod
- **Testing**: Vitest

## 📝 Licencia

Proprietary - Arkcutt Industrial

## 🤝 Contacto

Para soporte, crear issue en el repositorio.

---

**Versión**: 1.0.0
**Framework**: Mastra AI
**Target**: B2B Industrial - Máximo Determinismo
