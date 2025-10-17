# 🚀 Inicio Rápido - Arkcutt AI

## Instalación en 5 Pasos

### 1️⃣ Instalar Dependencias

```bash
npm install
```

### 2️⃣ Crear .env.local

Copia `.env.example` a `.env.local` y completa con tus credenciales:

```bash
# OpenAI API Key (REQUERIDO)
OPENAI_API_KEY=sk-proj-...

# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
MASTRA_LOG_LEVEL=info
MASTRA_ENABLE_TRACING=true
```

### 3️⃣ Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Ve al **SQL Editor**
3. Ejecuta las migraciones en orden:

**Migración 1: Tablas**
```sql
-- Copia y pega el contenido de:
-- supabase/migrations/001_create_tables.sql
```

**Migración 2: Funciones**
```sql
-- Copia y pega el contenido de:
-- supabase/migrations/002_create_functions.sql
```

**Migración 3: Índices y RLS**
```sql
-- Copia y pega el contenido de:
-- supabase/migrations/003_create_indexes_rls.sql
```

### 4️⃣ Ejecutar en Desarrollo

```bash
npm run dev
```

### 5️⃣ Abrir el Navegador

Abre [http://localhost:3000](http://localhost:3000)

---

## ✅ Verificar Instalación

### Test 1: Saludo Simple
```
Tú: "Hola"
Bot: Respuesta de bienvenida
```
**Esperado:** Confidence alta, sin agente necesario

### Test 2: Consulta de Material
```
Tú: "¿Cuál es la diferencia entre aluminio 6061 y 7075?"
Bot: Explicación técnica detallada
```
**Esperado:** Material Agent activado, información de la base de datos

### Test 3: Consulta de Servicio
```
Tú: "¿Pueden hacer anodizado?"
Bot: Explicación del servicio
```
**Esperado:** Proveedores Agent activado

### Test 4: Presupuesto Incompleto
```
Tú: "Necesito presupuesto para piezas en aluminio"
Bot: Solicita más información
```
**Esperado:** Material Agent o Ingeniería Agent solicita detalles

### Test 5: Presupuesto Completo
```
Tú: "Presupuesto para 100 piezas en aluminio 6061, ISO 2768-m, 3 semanas.
     Soy Juan García, jgarcia@empresa.com, Talleres García"
Bot: [SOLICITUD_COMPLETA] + resumen
```
**Esperado:** Ingeniería Agent genera solicitud completa y guarda en DB

---

## 🐛 Troubleshooting

### Error: "OPENAI_API_KEY is required"
**Solución:** Verifica que `.env.local` existe y tiene la key correcta

### Error: "Missing env.NEXT_PUBLIC_SUPABASE_URL"
**Solución:** Agrega las credenciales de Supabase a `.env.local`

### Error: "Table 'conversaciones' does not exist"
**Solución:** Ejecuta las migraciones de Supabase en el SQL Editor

### El bot no responde correctamente
**Solución:**
1. Verifica logs en la consola (terminal)
2. Revisa que MASTRA_LOG_LEVEL=debug para ver detalles
3. Verifica que tu API key de OpenAI tiene créditos

### No se guardan las conversaciones
**Solución:**
1. Verifica que las migraciones se ejecutaron correctamente
2. Revisa el RLS (Row Level Security) en Supabase
3. Verifica SUPABASE_SERVICE_ROLE_KEY

---

## 📊 Ver Logs del Sistema

Los logs aparecen en la terminal donde ejecutaste `npm run dev`:

```
ℹ️  [2025-10-17T...] 🚀 [Main Workflow] Session: abc123...
ℹ️  [2025-10-17T...] 🎯 [Intent Classification] User: test-user
ℹ️  [2025-10-17T...] ✅ Rule-based match: MATERIAL_QUERY
ℹ️  [2025-10-17T...] → Routing to Material Agent
ℹ️  [2025-10-17T...] 🤖 [Material Agent] Executing
ℹ️  [2025-10-17T...] ✅ Workflow completed in 2341ms
```

---

## 📈 Ver Datos en Supabase

1. Ve a tu proyecto en Supabase
2. Click en **Table Editor**
3. Revisa las tablas:
   - `conversaciones`: Todas las interacciones
   - `solicitudes_presupuesto`: Solicitudes completas
   - `workflow_traces`: Logs de workflows
   - `agent_metrics`: Métricas de performance

---

## 🎯 Próximos Pasos

Ahora que el sistema está funcionando:

1. **Personaliza los Agentes**
   - Edita `mastra/config/llm.config.ts` para ajustar prompts
   - Agrega más materiales en `lib/constants.ts`
   - Ajusta reglas en `mastra/workflows/intent-classification.workflow.ts`

2. **Agrega Tests**
   - Implementa tests en `tests/workflows/`
   - Ejecuta con `npm test`

3. **Deploy a Producción**
   - Ver `IMPLEMENTATION.md` sección Deployment
   - Usa Vercel para deploy rápido

---

## 📚 Documentación Adicional

- **Arquitectura completa:** Ver `IMPLEMENTATION.md`
- **Prompt original:** Ver inicio del README.md
- **Estructura del proyecto:** Ver README.md

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs detallados (MASTRA_LOG_LEVEL=debug)
2. Verifica las variables de entorno
3. Asegúrate que las migraciones de Supabase se ejecutaron
4. Verifica que tu API key de OpenAI funciona

---

**¡Listo! Ahora tienes un sistema de presupuestos industriales 100% determinista y production-ready** 🎉
