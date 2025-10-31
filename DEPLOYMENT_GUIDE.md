# 🚀 Guía de Deployment a Producción - Arkcutt AI

**Fecha:** 30 de Octubre, 2025
**Estado:** Ready for Production
**Target:** Vercel + Supabase

---

## 📋 Pre-requisitos

### Cuentas Necesarias
- ✅ Cuenta de Vercel (gratuita o Pro)
- ✅ Cuenta de Supabase (Pro recomendado para producción)
- ✅ Cuenta de OpenAI con créditos API
- ✅ Cuenta de Sentry (opcional, para error tracking)
- ✅ Cuenta de Google Cloud (para Gmail API y Google Places API)

### Variables de Entorno Requeridas

#### 1. OpenAI API
```env
OPENAI_API_KEY=sk-...
```
**Dónde obtenerla:** https://platform.openai.com/api-keys

#### 2. Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
**Dónde obtenerlas:**
- Dashboard de Supabase → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (¡MANTENER SECRETO!)

#### 3. App Configuration
```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

#### 4. Mastra Configuration (Opcional)
```env
MASTRA_LOG_LEVEL=info
MASTRA_ENABLE_TRACING=false
```

#### 5. Sentry (Opcional pero Recomendado)
```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/789012
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=arkcutt-ai
SENTRY_AUTH_TOKEN=sntrys_...
```
**Dónde obtenerlas:** https://sentry.io/settings/

#### 6. Google APIs (Opcional)
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_PLACES_API_KEY=...
```
**Setup:** Ver `scripts/get-gmail-token.js` para Gmail API

#### 7. Rate Limiting (Opcional)
```env
RATE_LIMIT_PER_MINUTE=20
```

#### 8. Cron Jobs (Vercel)
```env
CRON_SECRET=your-random-secret-string
```
**Generar:** `openssl rand -base64 32`

---

## 🏗️ Paso 1: Preparar Base de Datos Supabase

### 1.1 Crear Proyecto de Producción
1. Ve a https://supabase.com
2. Crear nuevo proyecto:
   - **Name:** arkcutt-ai-production
   - **Database Password:** Guardar en lugar seguro
   - **Region:** Más cercana a tus usuarios
   - **Plan:** Pro ($25/mes recomendado)

### 1.2 Ejecutar Migraciones
```bash
# En Supabase Dashboard → SQL Editor

# Ejecutar en orden:
1. 001_initial_schema.sql
2. 002_add_audit_logs.sql
3. 010_create_auth_system.sql
4. 011_fix_rls_recursion.sql
5. 012_simplify_rls.sql
6. 013_enhance_audit_logs_security.sql
7. 014_create_gdpr_tables.sql
```

### 1.3 Configurar Authentication
1. Dashboard → Authentication → Providers
2. Habilitar:
   - ✅ Email (con confirmación de email)
   - ✅ Google OAuth (opcional)
3. Configuration:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

### 1.4 Configurar RLS (Row Level Security)
- ✅ Ya configurado en migraciones
- Verificar políticas en Dashboard → Authentication → Policies

### 1.5 Crear Primer Usuario Admin
```sql
-- En SQL Editor
-- Primero crear usuario en Supabase Auth UI
-- Luego promover a admin:
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'tu-email@example.com';
```

---

## 🚀 Paso 2: Deploy a Vercel

### 2.1 Conectar Repositorio a Vercel
1. Ve a https://vercel.com
2. Click "New Project"
3. Importar tu repositorio Git
4. Configurar proyecto:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `npm run build`
   - **Output Directory:** .next
   - **Install Command:** `npm install`

### 2.2 Configurar Variables de Entorno
En Vercel Dashboard → Settings → Environment Variables

#### Production
Añadir todas las variables listadas arriba (Sección: Variables de Entorno Requeridas)

**⚠️ IMPORTANTE:**
- Las variables que empiezan con `NEXT_PUBLIC_` serán expuestas al cliente
- Las demás variables son server-only y NUNCA se expondrán al navegador
- `SUPABASE_SERVICE_ROLE_KEY` NUNCA debe ser expuesta (no usar NEXT_PUBLIC_)

### 2.3 Configurar Dominios
1. Settings → Domains
2. Añadir dominio personalizado (opcional):
   - `app.arkcutt.com` (ejemplo)
   - Configurar DNS según instrucciones de Vercel

### 2.4 Deploy
```bash
# Opción 1: Deploy desde Vercel Dashboard
- Click "Deploy"

# Opción 2: Deploy desde CLI
npm install -g vercel
vercel login
vercel --prod
```

### 2.5 Verificar Deployment
- ✅ Build exitoso sin errores
- ✅ Página carga correctamente
- ✅ Login funciona
- ✅ Dashboard muestra datos

---

## 🔧 Paso 3: Configuración Post-Deployment

### 3.1 Configurar Cron Jobs
Vercel leerá automáticamente `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-emails",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Verificar en Dashboard → Cron Jobs

### 3.2 Configurar Monitoring

#### Sentry (Error Tracking)
- Ya configurado en `next.config.ts`
- Verificar en https://sentry.io que los errores se reportan

#### Vercel Analytics
1. Dashboard → Analytics
2. Habilitar Web Analytics (gratis)
3. Habilitar Speed Insights ($10/mes, opcional)

### 3.3 Configurar Logs
- Logs disponibles en Vercel Dashboard → Deployments → [deployment] → Runtime Logs
- Winston logs aparecerán en Runtime Logs

---

## ✅ Checklist Pre-Launch

### Seguridad
- [x] Todas las variables de entorno configuradas
- [x] `SUPABASE_SERVICE_ROLE_KEY` es server-only (no NEXT_PUBLIC_)
- [x] RLS policies habilitadas en Supabase
- [x] HTTPS activo (automático en Vercel)
- [x] Security headers configurados (`next.config.ts`)
- [x] Rate limiting activo
- [x] CSRF protection activo
- [ ] Audit logs funcionando (verificar manualmente)

### Base de Datos
- [x] Migraciones ejecutadas
- [x] Authentication configurado
- [x] Primer usuario admin creado
- [ ] Backup automatizado configurado (Supabase Pro)

### Funcionalidad
- [ ] Login/Register funciona
- [ ] Dashboard muestra datos reales
- [ ] RFQs se pueden crear
- [ ] Proveedores se pueden buscar
- [ ] Email processing funciona (si Gmail API configurado)
- [ ] Integrations página funciona
- [ ] Settings página funciona

### Performance
- [ ] Lighthouse score > 90
- [ ] Time to First Byte < 600ms
- [ ] First Contentful Paint < 1.8s
- [ ] Bundle size < 500KB (initial)

### Monitoring
- [ ] Sentry captura errores
- [ ] Vercel Analytics activo
- [ ] Logs visibles en dashboard

---

## 🐛 Troubleshooting

### Error: "Module not found"
```bash
# Limpiar caché y reinstalar
rm -rf .next node_modules
npm install
npm run build
```

### Error: "Supabase client error"
- Verificar que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están configuradas
- Verificar que URL termina en `.supabase.co`
- Verificar que anon key empieza con `eyJ`

### Error: "Invalid login credentials"
- Verificar que migraciones de auth están aplicadas
- Verificar que usuario existe en Supabase Auth
- Verificar que `user_profiles` tabla existe y tiene el usuario

### Error: "Rate limit exceeded"
- Esperar 1-2 minutos
- Verificar `RATE_LIMIT_PER_MINUTE` en variables de entorno

### Build falla en Vercel
- Verificar que `npm run build` funciona localmente
- Verificar que todas las variables de entorno están configuradas
- Check build logs en Vercel Dashboard

### Cron jobs no se ejecutan
- Verificar que `CRON_SECRET` está configurado
- Verificar que el endpoint `/api/cron/process-emails` existe
- Solo disponible en plan Pro de Vercel

---

## 📊 Monitoreo Post-Launch

### Primera Semana
- [ ] Revisar logs diariamente
- [ ] Verificar errores en Sentry
- [ ] Monitorear performance en Vercel Analytics
- [ ] Verificar uso de base de datos en Supabase

### Primera Mes
- [ ] Revisar costos de infraestructura
- [ ] Optimizar queries lentas
- [ ] Actualizar dependencias críticas
- [ ] Backup manual de base de datos

---

## 💰 Costos Estimados

### Mínimo (Development/Testing)
- Vercel Hobby: **$0/mes** (límites de bandwidth)
- Supabase Free: **$0/mes** (límites de DB)
- **Total: $0/mes**

### Recomendado (Production)
- Vercel Pro: **$20/mes**
- Supabase Pro: **$25/mes**
- Sentry Team: **$26/mes** (opcional)
- OpenAI API: **~$10-50/mes** (variable según uso)
- Google Cloud: **~$0-10/mes** (según uso de APIs)
- **Total: ~$81/mes** (~€75/mes)

### Enterprise
- Vercel Enterprise: **Contactar ventas**
- Supabase Team: **$599/mes**
- Sentry Business: **$80/mes**
- **Total: Custom pricing**

---

## 🔄 Próximos Pasos

### Semana 1-2 Post-Launch
1. ✅ Monitorear errores y performance
2. ✅ Recopilar feedback de usuarios
3. ✅ Hot fixes si necesario
4. ✅ Optimizaciones rápidas

### Mes 1-2 Post-Launch
1. ⏳ Implementar features pendientes (notificaciones, PWA, export/import)
2. ⏳ E2E tests con Playwright
3. ⏳ Performance optimization avanzada
4. ⏳ CI/CD pipeline con GitHub Actions

### Mes 3+ Post-Launch
1. ⏳ Escalamiento horizontal
2. ⏳ Internacionalización (i18n)
3. ⏳ Mobile app (React Native)
4. ⏳ Advanced analytics

---

## 📞 Soporte & Recursos

### Documentación
- **Vercel:** https://vercel.com/docs
- **Supabase:** https://supabase.com/docs
- **Next.js:** https://nextjs.org/docs
- **Sentry:** https://docs.sentry.io

### Soporte
- **Vercel:** support@vercel.com
- **Supabase:** support@supabase.io
- **GitHub Issues:** Tu repositorio

---

**¡Listo para producción! 🎉**

**Última actualización:** 30 de Octubre, 2025
**Versión:** 1.0
**Autor:** Development Team
