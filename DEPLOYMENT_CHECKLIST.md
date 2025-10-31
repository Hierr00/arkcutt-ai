# ✅ Checklist de Deployment - Arkcutt AI

**Fecha de inicio:** 30 de Octubre, 2025
**Estado:** En progreso

---

## 📋 FASE 1: Preparación de Supabase

### 1.1 Verificar Proyecto Actual
- [ ] Ir a https://supabase.com/dashboard
- [ ] Abrir proyecto: `[NOMBRE DE TU PROYECTO]`
- [ ] Anotar:
  - Project URL: `https://__________.supabase.co`
  - Project API Key (anon): `eyJ__________`
  - Service Role Key: `eyJ__________` (¡SECRETO!)

### 1.2 Verificar Migraciones
Ir a: SQL Editor → ejecutar:
```sql
-- Ver tablas existentes
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Tablas que DEBEN existir:**
- [ ] user_profiles
- [ ] user_sessions
- [ ] role_permissions
- [ ] audit_logs
- [ ] quotation_requests (o similar)
- [ ] external_quotations (o similar)
- [ ] provider_contacts

**Si faltan tablas:** Ejecutar migraciones en orden desde `supabase/migrations/`

### 1.3 Limpiar Datos de Prueba
```sql
-- Ver usuarios de prueba
SELECT email, role, created_at FROM user_profiles;

-- OPCIONAL: Borrar usuarios de prueba (CUIDADO!)
-- DELETE FROM user_profiles WHERE email LIKE '%test%';
-- DELETE FROM user_profiles WHERE email LIKE '%example%';
```

### 1.4 Configurar Authentication
- [ ] Ir a: Authentication → Providers
- [ ] Verificar Email provider: **Enabled**
- [ ] Email confirmation: **Disabled** (para facilitar testing)
- [ ] Ir a: Authentication → URL Configuration
- [ ] Site URL: `https://tu-app.vercel.app` (cambiar después del deploy)
- [ ] Redirect URLs: `https://tu-app.vercel.app/**`

---

## 📋 FASE 2: Generar Secrets

### 2.1 Generar CRON_SECRET
Ejecutar en terminal local:
```bash
# Windows (PowerShell)
$bytes = New-Object Byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# O usar online: https://generate-secret.vercel.app/32
```

**Anotar CRON_SECRET:**
```
CRON_SECRET=_________________________________
```

---

## 📋 FASE 3: Preparar Variables de Entorno

### 3.1 Variables Obligatorias

```env
# === OpenAI ===
OPENAI_API_KEY=sk-proj-___________________________

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://__________.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ__________________________
SUPABASE_SERVICE_ROLE_KEY=eyJ__________________________ (¡NO NEXT_PUBLIC_!)

# === App ===
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
NODE_ENV=production

# === Cron ===
CRON_SECRET=________________________________
```

### 3.2 Variables Opcionales (Recomendadas)

```env
# === Gmail API (para procesamiento de emails) ===
GMAIL_CLIENT_ID=___________________________
GMAIL_CLIENT_SECRET=_______________________
GMAIL_REFRESH_TOKEN=_______________________
GMAIL_REDIRECT_URI=http://localhost:3000

# === Google Places (para búsqueda de proveedores) ===
GOOGLE_PLACES_API_KEY=_____________________

# === Sentry (error tracking) ===
NEXT_PUBLIC_SENTRY_DSN=https://________@o_______.ingest.sentry.io/_____
SENTRY_ORG=tu-org
SENTRY_PROJECT=arkcutt-ai
SENTRY_AUTH_TOKEN=sntrys_________________

# === Rate Limiting ===
RATE_LIMIT_PER_MINUTE=20

# === Mastra ===
MASTRA_LOG_LEVEL=info
MASTRA_ENABLE_TRACING=false
```

**Copia estas variables en un archivo temporal para tenerlas listas**

---

## 📋 FASE 4: Vercel Setup

### 4.1 Crear Cuenta Vercel Pro
- [ ] Ir a https://vercel.com
- [ ] Sign up / Login
- [ ] Ir a: Settings → Billing
- [ ] Upgrade a **Pro Plan** ($20/mes)
  - ¿Por qué? Para que funcionen los cron jobs automáticos

### 4.2 Conectar Repositorio
- [ ] Dashboard → "Add New Project"
- [ ] Import Git Repository
- [ ] Seleccionar tu repositorio de GitHub/GitLab
- [ ] Framework Preset: **Next.js** (auto-detectado)
- [ ] Root Directory: `./`
- [ ] **NO HACER DEPLOY TODAVÍA** - Click "Configure Project"

### 4.3 Configurar Variables de Entorno
En la pantalla de configuración:

- [ ] Ir a "Environment Variables"
- [ ] Añadir TODAS las variables de FASE 3
- [ ] Environment: **Production** (importante!)
- [ ] Verificar que `SUPABASE_SERVICE_ROLE_KEY` NO tiene prefijo `NEXT_PUBLIC_`

**Tips:**
- Copia/pega desde tu archivo temporal
- Ten cuidado con espacios extra
- Las que empiezan con `NEXT_PUBLIC_` son públicas (visible en browser)
- Las demás son server-only (seguras)

---

## 📋 FASE 5: Deploy Inicial

### 5.1 Deploy
- [ ] Click **"Deploy"** en Vercel
- [ ] Esperar ~2-5 minutos
- [ ] Deployment status: **Ready** ✅

### 5.2 Obtener URL de Producción
- [ ] Copiar URL: `https://tu-app-xxxx.vercel.app`
- [ ] Anotar dominio:
```
Dominio de producción: _______________________
```

### 5.3 Actualizar Supabase URLs
- [ ] Volver a Supabase Dashboard
- [ ] Authentication → URL Configuration
- [ ] Site URL: `https://tu-app-xxxx.vercel.app`
- [ ] Redirect URLs: `https://tu-app-xxxx.vercel.app/**`
- [ ] Guardar

### 5.4 Actualizar Variable en Vercel
- [ ] Vercel Dashboard → Settings → Environment Variables
- [ ] Editar `NEXT_PUBLIC_APP_URL`
- [ ] Valor: `https://tu-app-xxxx.vercel.app`
- [ ] Save
- [ ] Re-deploy: Deployments → Latest → Redeploy

---

## 📋 FASE 6: Verificación

### 6.1 Verificar que la App Carga
- [ ] Abrir: `https://tu-app-xxxx.vercel.app`
- [ ] La página debe cargar sin errores
- [ ] Verificar que muestra login page

### 6.2 Crear Primer Usuario Admin
**Opción A: Desde UI**
- [ ] Click "Register" / "Create Account"
- [ ] Email: tu-email@tudominio.com
- [ ] Password: [password seguro]
- [ ] Submit
- [ ] Verificar email si está habilitado

**Luego promover a admin:**
- [ ] Ir a Supabase Dashboard → SQL Editor
- [ ] Ejecutar:
```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'tu-email@tudominio.com';
```

### 6.3 Verificar Login
- [ ] Volver a la app
- [ ] Login con tus credenciales
- [ ] Debe redirigir a `/dashboard`
- [ ] Dashboard debe cargar (puede estar vacío)

### 6.4 Verificar Logs
- [ ] Vercel Dashboard → Deployments → Latest
- [ ] Click en el deployment
- [ ] Ver "Runtime Logs"
- [ ] NO debe haber errores críticos

---

## 📋 FASE 7: Verificar Cron Jobs

### 7.1 Verificar Configuración
- [ ] Vercel Dashboard → Settings → Cron Jobs
- [ ] Debe aparecer: `/api/cron/process-emails` (cada 5 minutos)
- [ ] Status: **Active**

### 7.2 Test Manual del Cron
Ejecutar en terminal:
```bash
curl -X POST https://tu-app-xxxx.vercel.app/api/cron/process-emails \
  -H "Authorization: Bearer [tu-CRON-SECRET]"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "timestamp": "2025-10-30T...",
  "result": { ... }
}
```

### 7.3 Test de Email Real (si Gmail configurado)
- [ ] Enviar email a tu cuenta Gmail configurada
- [ ] Asunto: "Solicitud de presupuesto - Test"
- [ ] Cuerpo: Descripción de pieza a mecanizar
- [ ] Adjuntar PDF técnico (opcional)
- [ ] Esperar máximo 5 minutos
- [ ] Verificar en Dashboard que apareció RFQ
- [ ] Verificar logs en Vercel

---

## 📋 FASE 8: Configurar Dominio (Opcional)

### 8.1 Si tienes dominio propio
- [ ] Vercel Dashboard → Settings → Domains
- [ ] Add Domain: `app.tudominio.com`
- [ ] Configurar DNS según instrucciones
- [ ] Verificar SSL automático

### 8.2 Actualizar URLs
Si configuras dominio:
- [ ] Actualizar `NEXT_PUBLIC_APP_URL` en Vercel
- [ ] Actualizar Site URL en Supabase
- [ ] Re-deploy

---

## 📋 FASE 9: Monitoreo Inicial

### 9.1 Primera Hora
- [ ] Revisar logs cada 15 minutos
- [ ] Verificar que no hay errores 500
- [ ] Verificar que cron job se ejecuta
- [ ] Probar crear RFQ manualmente en UI

### 9.2 Primer Día
- [ ] Revisar logs 3-4 veces
- [ ] Verificar uso de OpenAI API
- [ ] Verificar uso de Supabase (Database → Usage)
- [ ] Probar todas las páginas principales

### 9.3 Primera Semana
- [ ] Monitoreo diario
- [ ] Verificar costos de OpenAI
- [ ] Verificar que emails se procesan
- [ ] Recopilar feedback

---

## ✅ DEPLOYMENT COMPLETADO

Cuando todas las fases estén marcadas:

**Tu app está en producción:** `https://tu-app-xxxx.vercel.app`

**Próximos pasos:**
- Compartir URL con stakeholders
- Comenzar a procesar RFQs reales
- Considerar implementar webhook Gmail (ver `FUTURE_WEBHOOK_GMAIL.md`)
- Seguir roadmap para features adicionales

---

## 🐛 Troubleshooting Rápido

### Build falla
- Verificar que `npm run build` funciona en local
- Revisar logs de build en Vercel
- Verificar que todas las env vars están configuradas

### "Unauthorized" en login
- Verificar URLs en Supabase Auth configuration
- Verificar que migraciones de auth están aplicadas
- Crear usuario manualmente en Supabase si es necesario

### Cron job no funciona
- Verificar que estás en Vercel Pro
- Verificar `CRON_SECRET` configurado
- Probar endpoint manualmente con curl

### Emails no se procesan
- Verificar Gmail API credentials
- Renovar `GMAIL_REFRESH_TOKEN` si expiró
- Verificar logs del cron job

---

**Última actualización:** 30 de Octubre, 2025
**Tiempo estimado:** 1-2 horas
**Dificultad:** Media
