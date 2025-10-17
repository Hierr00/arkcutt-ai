# 🚀 Instrucciones de Configuración

## Paso 1: Configurar Variables de Entorno

He creado un archivo `.env.local` en la raíz del proyecto. Necesitas editarlo y reemplazar las credenciales de ejemplo con las tuyas reales:

### 1.1 OpenAI API Key (OBLIGATORIO)

```bash
OPENAI_API_KEY=sk-proj-REEMPLAZA_CON_TU_KEY
```

**Cómo obtenerla:**
1. Ve a https://platform.openai.com/api-keys
2. Inicia sesión o crea una cuenta
3. Haz clic en "Create new secret key"
4. Copia la key y reemplázala en `.env.local`

### 1.2 Supabase (OBLIGATORIO)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Cómo obtenerlas:**
1. Ve a https://supabase.com
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Ve a Settings → API
5. Copia:
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon/public` key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` key → SUPABASE_SERVICE_ROLE_KEY

### 1.3 Ejecutar Migraciones de Supabase

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Ejecuta las 3 migraciones en orden:

**Migración 1:**
```sql
-- Copia y pega todo el contenido de:
-- supabase/migrations/001_create_tables.sql
```

**Migración 2:**
```sql
-- Copia y pega todo el contenido de:
-- supabase/migrations/002_create_functions.sql
```

**Migración 3:**
```sql
-- Copia y pega todo el contenido de:
-- supabase/migrations/003_create_indexes_rls.sql
```

---

## Paso 2: Reiniciar el Servidor

Después de configurar las variables de entorno:

```bash
# Detén el servidor (Ctrl+C)
# Reinicia
npm run dev
```

---

## Paso 3: Verificar que Funciona

1. Abre http://localhost:3000
2. Escribe "Hola" y presiona Enter
3. Deberías recibir una respuesta del bot

---

## ⚠️ Errores Comunes

### Error: "OPENAI_API_KEY not configured"
**Solución:** Edita `.env.local` y agrega tu key de OpenAI

### Error: "Supabase credentials not configured"
**Solución:** Edita `.env.local` y agrega tus credenciales de Supabase

### Error: "Table 'conversaciones' does not exist"
**Solución:** Ejecuta las migraciones SQL en Supabase

### El bot no responde
**Solución:**
1. Verifica que `.env.local` existe y tiene las keys correctas
2. Verifica que las migraciones de Supabase se ejecutaron
3. Revisa los logs en la terminal

---

## 📝 Notas

- **No compartas tu `.env.local`** - contiene keys privadas
- **`.env.local` está en `.gitignore`** - no se subirá a Git
- **Las keys de OpenAI cuestan dinero** - revisa tu uso en https://platform.openai.com/usage

---

Una vez configurado todo, el sistema estará listo para usar. ¡Disfruta! 🎉
