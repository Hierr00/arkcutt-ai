# 🔧 Quick Fix: Error 500 en Registro

## Problema
Error 500 al intentar registrarse en `/auth/v1/signup`

## Causa
La migración de base de datos no se ha aplicado todavía, por lo que el trigger `handle_new_user` está intentando insertar en una tabla que no existe.

## Solución Rápida

### Opción 1: Deshabilitar el trigger temporalmente

**Paso 1:** Ve a Supabase Dashboard → SQL Editor y ejecuta:

```sql
-- Deshabilitar el trigger temporalmente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

**Paso 2:** Ahora puedes registrarte sin error

**Paso 3:** Después de registrarte, aplica la migración completa (ver abajo)

---

### Opción 2: Aplicar la migración completa AHORA

**Paso 1:** Ve a Supabase Dashboard → SQL Editor

**Paso 2:** Copia y pega TODO el contenido de:
`supabase/migrations/010_create_auth_system.sql`

**Paso 3:** Click en "Run"

**Paso 4:** Verifica que se ejecutó correctamente (debería mostrar el mensaje de éxito)

**Paso 5:** Ahora puedes registrarte sin problemas

---

## Verificar que la migración se aplicó

Ejecuta esto en SQL Editor:

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'user_sessions', 'role_permissions');

-- Debería devolver 3 filas
```

Si devuelve 3 filas, la migración está aplicada correctamente.

---

## Crear primer usuario admin

Una vez registrado, promover a admin:

```sql
-- Reemplaza con tu email
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'tu-email@example.com';
```

---

## Si sigue sin funcionar

Si el error persiste después de aplicar la migración, verifica:

1. **Environment variables** están configuradas en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

2. **Email Auth está habilitado** en Supabase:
   - Dashboard → Authentication → Settings
   - Email provider = Enabled

3. **Site URL está configurada**:
   - Dashboard → Authentication → Settings
   - Site URL = `http://localhost:3000`

---

## Logs de Debug

Para ver el error exacto, revisa:
- Supabase Dashboard → Authentication → Logs
- Browser Console (F12)

El error específico te dirá qué falta.
