# 🚀 Plan de Deployment - Decisiones Tomadas

**Fecha:** 30 de Octubre, 2025
**Estado:** Listo para deployment

---

## ✅ Decisiones de Infraestructura

### Base de Datos
```
📊 Supabase: MISMO proyecto (development + production)
💰 Costo: $0/mes (plan Free)
✅ Razón: Suficiente para MVP, ahorro de $25/mes
```

### Hosting
```
🚀 Vercel: Plan Pro
💰 Costo: $20/mes
✅ Razón: Necesario para cron jobs automáticos
```

### Sistema de Emails
```
📧 Método actual: Cron Job (cada 5 minutos)
⏰ Ejecución: Automática con Vercel Pro
🔮 Futuro: Webhook Gmail (tiempo real)
```

### Costos Mensuales Totales
```
Vercel Pro:        $20/mes
Supabase Free:     $0/mes
OpenAI API:        ~$10-20/mes (según uso)
────────────────────────────────────
TOTAL:             ~$30-40/mes
```

---

## 📋 Checklist de Deployment

### 1. Preparación Local (Ya completado ✅)
- [x] TypeScript compila sin errores
- [x] Tests pasando (192 tests)
- [x] Variables de entorno documentadas
- [x] Guía de deployment creada

### 2. Supabase (30 minutos)
- [ ] Limpiar datos de prueba en proyecto existente
- [ ] Verificar migraciones aplicadas (7 archivos)
- [ ] Configurar Auth providers
- [ ] Crear primer usuario admin
- [ ] Verificar RLS policies activas

### 3. Vercel (15 minutos)
- [ ] Crear cuenta Vercel Pro ($20/mes)
- [ ] Conectar repositorio Git
- [ ] Configurar variables de entorno (ver lista abajo)
- [ ] Deploy inicial
- [ ] Verificar deployment exitoso

### 4. Verificación Post-Deployment (30 minutos)
- [ ] Login funciona
- [ ] Dashboard carga con datos
- [ ] Crear RFQ de prueba
- [ ] Enviar email de prueba a la cuenta Gmail
- [ ] Esperar 5 minutos y verificar que se procesa
- [ ] Verificar logs en Vercel
- [ ] Verificar Sentry captura errores (si configurado)

---

## 🔑 Variables de Entorno para Vercel

### Críticas (Obligatorias)
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
NODE_ENV=production
```

### Para Cron Jobs
```env
CRON_SECRET=[generar con: openssl rand -base64 32]
```

### Gmail API (Opcional pero recomendado)
```env
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_REDIRECT_URI=http://localhost:3000
```

### Sentry (Opcional)
```env
NEXT_PUBLIC_SENTRY_DSN=https://...@o...ingest.sentry.io/...
SENTRY_ORG=tu-org
SENTRY_PROJECT=arkcutt-ai
SENTRY_AUTH_TOKEN=sntrys_...
```

### Google Places (Opcional)
```env
GOOGLE_PLACES_API_KEY=...
```

---

## 📧 Configuración del Sistema de Emails

### Cron Job Actual (Vercel Pro)
El archivo `vercel.json` ya está configurado:

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

**Funcionamiento:**
1. Cada 5 minutos, Vercel llama automáticamente al endpoint
2. El endpoint lee emails no leídos de Gmail
3. Procesa cada email y crea RFQs
4. Marca emails como leídos

**Para verificar que funciona:**
```bash
# Enviar email de prueba a tu cuenta Gmail
# Esperar máximo 5 minutos
# Verificar en Dashboard que apareció el RFQ
# Revisar logs: Vercel Dashboard → Deployments → Runtime Logs
```

---

## 🔮 Próximo Paso: Webhook Gmail (Tiempo Real)

**Documentado en:** `FUTURE_WEBHOOK_GMAIL.md`

**Cuándo implementar:**
- ✅ Después del deployment inicial exitoso
- ✅ Cuando quieras procesamiento instantáneo (< 10 seg)
- ✅ Cuando quieras ahorrar $20/mes (Vercel Free)

**Beneficios:**
- Emails se procesan al instante
- Ya no necesitas Vercel Pro
- Ahorro de $20/mes
- Sistema más profesional

**Tiempo estimado:** 2-3 horas

---

## 🐛 Troubleshooting Común

### Cron job no funciona
**Síntomas:** Emails no se procesan automáticamente

**Soluciones:**
1. Verificar que estás en Vercel Pro (no Free)
2. Verificar que `CRON_SECRET` está configurado
3. Revisar logs: Dashboard → Deployments → Runtime Logs
4. Verificar que Gmail API está configurada correctamente

**Test manual:**
```bash
curl -X POST https://tu-app.vercel.app/api/cron/process-emails \
  -H "Authorization: Bearer [tu-CRON-SECRET]"
```

### Emails no se leen
**Síntomas:** Cron funciona pero no encuentra emails

**Soluciones:**
1. Verificar que `GMAIL_REFRESH_TOKEN` está configurado
2. Verificar permisos de Gmail API
3. Ejecutar `node scripts/get-gmail-token.js` para renovar token
4. Verificar que el email llegó a INBOX (no spam)

### "Invalid login credentials"
**Síntomas:** No puedes hacer login en la app

**Soluciones:**
1. Verificar que migraciones de auth están aplicadas
2. Crear usuario manualmente en Supabase Dashboard
3. Promover a admin con SQL:
```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'tu-email@example.com';
```

---

## 📊 Monitoreo Post-Launch

### Primera Hora
- [ ] Verificar que la app carga
- [ ] Hacer login exitoso
- [ ] Crear RFQ manual
- [ ] Enviar email de prueba
- [ ] Verificar procesamiento automático

### Primer Día
- [ ] Revisar logs de errores en Vercel
- [ ] Verificar uso de OpenAI API
- [ ] Verificar uso de base de datos Supabase
- [ ] Revisar Sentry (si configurado)

### Primera Semana
- [ ] Monitorear performance
- [ ] Verificar que cron jobs se ejecutan
- [ ] Revisar costos de OpenAI
- [ ] Recopilar feedback de usuarios

---

## 🎯 Siguientes Pasos Después del Launch

### Semana 1-2
1. ✅ Monitorear estabilidad
2. ✅ Hot fixes si necesario
3. ✅ Implementar webhook Gmail (opcional)
4. ✅ Configurar backups manuales

### Mes 1
1. ⏳ E2E tests con Playwright
2. ⏳ Performance optimization
3. ⏳ Features adicionales (notificaciones, PWA)

### Mes 2-3
1. ⏳ Considerar Supabase Pro si:
   - Base de datos > 500MB
   - Bandwidth > 2GB/mes
   - Necesitas backups automáticos

---

## 💡 Tips Pro

### Ahorro de Costos
- Usa Supabase Free mientras sea posible
- Monitorea uso de OpenAI API (puede ser variable)
- Considera webhook para eliminar Vercel Pro a futuro

### Performance
- Primeras 48 horas: monitorear logs constantemente
- Optimizar queries lentas con índices en Supabase
- Cachear respuestas frecuentes

### Seguridad
- Rotar `CRON_SECRET` cada 3 meses
- Monitorear audit logs en Supabase
- Revisar Sentry para errores críticos

---

## ✅ Ready to Deploy!

**Próximo paso:** Seguir `DEPLOYMENT_GUIDE.md` sección "Paso 2: Deploy a Vercel"

**Tiempo estimado total:** ~1 hora

**¿Alguna duda antes de empezar?** 🚀

---

**Última actualización:** 30 de Octubre, 2025
**Configuración:** Vercel Pro + Supabase Free + Cron Job
**Costo mensual:** ~$30-40
