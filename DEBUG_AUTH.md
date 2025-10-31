# 🔍 Debug Auth Error 500

## Paso 1: Verificar que las tablas existen

Ve a **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'user_sessions', 'role_permissions');
```

**Resultado esperado:** Debe devolver 3 filas

---

## Paso 2: Verificar que el trigger existe

```sql
-- Verificar trigger
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Resultado esperado:** Debe devolver 1 fila

---

## Paso 3: Aplicar el fix del trigger

Ejecuta el contenido completo de: `supabase/migrations/010_fix_auth_trigger.sql`

Esto actualizará el trigger con mejor manejo de errores.

---

## Paso 4: Verificar permisos RLS

```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';
```

**Resultado esperado:** `rowsecurity` debe ser `true`

```sql
-- Ver las políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'user_profiles';
```

**Resultado esperado:** Debe mostrar varias políticas

---

## Paso 5: Verificar Email Auth en Supabase

1. Ve a **Authentication → Settings**
2. Verifica:
   - ✅ **Email** provider está habilitado
   - ✅ **Confirm email** está DESHABILITADO (para testing)
   - ✅ **Site URL:** `http://localhost:3000`
   - ✅ **Redirect URLs:**
     ```
     http://localhost:3000/**
     http://localhost:3000/dashboard
     http://localhost:3000/auth/callback
     ```

---

## Paso 6: Probar registro manualmente

Ejecuta esto en SQL Editor para simular el trigger:

```sql
-- Simular un signup manual
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
BEGIN
  -- Insertar perfil manualmente
  INSERT INTO user_profiles (id, email, role, email_verified)
  VALUES (test_user_id, test_email, 'viewer', false);

  RAISE NOTICE 'Test profile created successfully: %', test_user_id;

  -- Limpiar test
  DELETE FROM user_profiles WHERE id = test_user_id;
  RAISE NOTICE 'Test profile deleted';
END $$;
```

**Resultado esperado:** Debe mostrar los mensajes de NOTICE sin errores

---

## Paso 7: Ver logs de Supabase

1. Ve a **Authentication → Logs**
2. Intenta registrarte nuevamente
3. Busca el log del signup
4. Copia el error exacto aquí

---

## Paso 8: Probar con la versión mejorada

El código ya está actualizado con:
- ✅ Retry logic (3 intentos)
- ✅ Fallback a creación manual si trigger falla
- ✅ Mejor logging de errores

**Ahora intenta registrarte de nuevo:**
1. Abre la consola del navegador (F12)
2. Ve a la pestaña Console
3. Intenta registrarte
4. Copia cualquier error que aparezca en rojo

---

## Paso 9: Si sigue fallando - Solución temporal

Ejecuta esto para DESHABILITAR el trigger temporalmente:

```sql
-- Deshabilitar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

Ahora el código creará el perfil manualmente (gracias al fallback que agregamos).

---

## Paso 10: Verificar .env.local

Asegúrate de que tienes:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ajyadxczyhvviynlgsbe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**NO debe tener espacios ni comillas adicionales**

---

## Checklist de debugging

- [ ] Tablas existen (Paso 1)
- [ ] Trigger existe (Paso 2)
- [ ] Fix del trigger aplicado (Paso 3)
- [ ] RLS configurado (Paso 4)
- [ ] Email auth habilitado (Paso 5)
- [ ] Test manual funciona (Paso 6)
- [ ] Logs revisados (Paso 7)
- [ ] Código actualizado (Paso 8)
- [ ] .env.local correcto (Paso 10)

---

## Errores Comunes

### Error: "relation user_profiles does not exist"
**Solución:** La migración no se aplicó. Ejecuta `010_create_auth_system.sql` completo.

### Error: "new row violates row-level security policy"
**Solución:** Ejecuta esto:
```sql
-- Deshabilitar RLS temporalmente para testing
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

### Error: "duplicate key value violates unique constraint"
**Solución:** Ya existe un usuario con ese email. Usa otro email o elimina el anterior:
```sql
DELETE FROM auth.users WHERE email = 'tu-email@example.com';
```

---

## 📋 Siguiente paso

1. **Aplica el fix:** `010_fix_auth_trigger.sql`
2. **Intenta registrarte nuevamente**
3. **Mira la consola del navegador (F12)** para ver los logs
4. **Si aún falla**, copia el error exacto de la consola

El código ahora debería funcionar incluso si el trigger falla, porque creará el perfil manualmente.
