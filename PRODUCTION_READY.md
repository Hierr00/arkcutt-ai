# 🚀 Production Readiness Guide

Este documento resume todas las features de producción implementadas y los pasos necesarios para deployment.

## ✅ Features Implementadas

### 1. 📊 Structured Logging con Winston

**Status**: ✅ Completado

Sistema de logging profesional que reemplaza console.log simple.

**Features:**
- Logs estructurados en JSON para análisis
- Diferentes niveles: debug, info, warn, error
- Rotación automática de archivos de logs
- Logs separados para errores (retención 30 días)
- Metadata contextual automática (service, environment)
- Colores en desarrollo, JSON en producción

**Archivos:**
- `lib/logger.ts` - Logger service
- `mastra.ts` - Export de log function
- `logs/` - Directorio de logs (gitignored)

**Uso:**
```typescript
import { log } from '@/mastra';

log('info', 'Usuario creó quotation', { userId: 123, quotationId: 'abc' });
log('error', 'Error procesando email', { error: err.message });
```

**Configuración:**
```bash
# .env.local
LOG_LEVEL=info # debug | info | warn | error
```

---

### 2. 🔍 Sentry Error Tracking

**Status**: ✅ Completado (requiere configuración)

Sistema completo de error tracking y performance monitoring.

**Features:**
- Tracking de errores en cliente, servidor y edge runtime
- Performance monitoring de APIs y páginas
- Session replay (10% de sesiones, 100% de errores)
- Integración con Winston logger
- Sanitización automática de datos sensibles
- Source maps en producción

**Archivos:**
- `sentry.client.config.ts` - Cliente
- `sentry.server.config.ts` - Servidor
- `sentry.edge.config.ts` - Edge runtime
- `next.config.ts` - Webpack plugin
- `lib/logger.ts` - Auto-captura de errores
- `SENTRY_SETUP.md` - Guía de configuración

**Configuración necesaria:**
```bash
# .env.local y .env.production
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token # Para source maps
```

**Setup:**
1. Crear cuenta en [Sentry.io](https://sentry.io/)
2. Crear proyecto Next.js
3. Copiar DSN y configurar variables
4. Ver guía completa en `SENTRY_SETUP.md`

---

### 3. ⏱️ Rate Limiting para APIs

**Status**: ✅ Completado

Sistema sofisticado de rate limiting con Bottleneck para control de costos.

**APIs protegidas:**
- ✅ Google Places API (100 req/min, 5 concurrent)
- ✅ OpenAI API (450 req/min, 10 concurrent)
- ✅ Gmail API (100 ops/min, 3 concurrent)
- ✅ Web Scraping (50 sites/min, 5 concurrent)

**Features:**
- Control de concurrencia
- Tiempo mínimo entre requests
- Reservoir con refresh automático
- Sistema de prioridades (0-9)
- Retry automático con backoff
- Logging de eventos (depleted, retry, failed)
- Monitoreo de estado de limiters

**Archivos:**
- `lib/rate-limiter.ts` - Rate limiter service
- Integrado en:
  - `lib/tools/provider-search.tools.ts` - Google Places
  - `lib/services/email-extractor.service.ts` - Web scraping + OpenAI
  - `lib/agents/quotation-coordinator.agent.ts` - OpenAI

**Uso:**
```typescript
import { withRateLimit, googlePlacesLimiter } from '@/lib/rate-limiter';

const result = await withRateLimit(
  googlePlacesLimiter,
  () => mapsClient.textSearch({ ... }),
  { priority: 7, weight: 1 }
);
```

**Monitoreo:**
```typescript
import { getLimiterStatus, logLimitersStatus } from '@/lib/rate-limiter';

// Log status de todos los limiters
logLimitersStatus();
```

---

### 4. 📋 Audit Logs System

**Status**: ✅ Completado (requiere migración)

Sistema completo de auditoría para compliance y debugging.

**Features:**
- Tracking de todas las operaciones críticas
- Categorías: quotation, email, rfq, provider, system
- Actor tracking (user, system, agent, cron)
- Resource tracking con before/after changes
- Views pre-construidas para análisis
- RLS policies para seguridad
- Auto-limpieza de logs antiguos (90 días)

**Eventos trackeados:**
- ✅ Quotation created/updated/status changed
- ✅ Email sent/received/failed
- ✅ RFQ created/sent/response received
- ✅ Provider search/contact/added
- ✅ Workflow started/completed/failed

**Archivos:**
- `supabase/migrations/009_create_audit_logs.sql` - Migration
- `lib/services/audit.service.ts` - Audit service
- `scripts/apply-migration-009.js` - Apply script

**Setup:**
1. Aplicar migración en Supabase Dashboard
2. Ejecutar: `node scripts/apply-migration-009.js` (muestra SQL)

**Uso:**
```typescript
import { logQuotationCreated, logEmailSent } from '@/lib/services/audit.service';

await logQuotationCreated(quotationId, customerEmail, {
  partsCount: 3,
  estimatedValue: 1500
});

await logEmailSent(emailId, to, subject, {
  quotationId,
  missingInfo: ['tolerances']
});
```

**Queries:**
```typescript
import {
  getRecentAuditLogs,
  getAuditLogsForResource,
  getRecentErrors
} from '@/lib/services/audit.service';

// Últimos 100 eventos
const logs = await getRecentAuditLogs(100);

// Historia de un recurso
const quotationHistory = await getAuditLogsForResource(
  'quotation_request',
  quotationId
);

// Errores recientes (últimas 24h)
const errors = await getRecentErrors(50);
```

---

## 📋 Checklist de Deployment

### Pre-Deployment

- [ ] **Aplicar migraciones de base de datos**
  ```bash
  node scripts/apply-migration-008.js # Provider constraints
  node scripts/apply-migration-009.js # Audit logs
  ```

- [ ] **Configurar Sentry**
  - [ ] Crear proyecto en Sentry.io
  - [ ] Copiar DSN y configurar variables de entorno
  - [ ] Generar auth token para source maps
  - [ ] Testear con `SENTRY_TEST_MODE=true`

- [ ] **Variables de entorno en producción**
  ```bash
  # Sentry
  NEXT_PUBLIC_SENTRY_DSN=...
  SENTRY_ORG=...
  SENTRY_PROJECT=...
  SENTRY_AUTH_TOKEN=...

  # Logging
  LOG_LEVEL=info
  NODE_ENV=production

  # APIs (ya existentes)
  GOOGLE_PLACES_API_KEY=...
  OPENAI_API_KEY=...
  GMAIL_CLIENT_ID=...
  # ... resto de vars
  ```

- [ ] **Verificar límites de APIs**
  - [ ] Google Places: Configurar billing y límites
  - [ ] OpenAI: Verificar límites de cuenta
  - [ ] Gmail: Verificar quotas

- [ ] **Testing**
  - [ ] Run `npm run type-check`
  - [ ] Run `npm run build`
  - [ ] Test logging: `npx tsx scripts/test-logger.js`
  - [ ] Test workflow completo

### Post-Deployment

- [ ] **Monitoreo inicial**
  - [ ] Verificar errores en Sentry dashboard
  - [ ] Verificar logs en sistema de hosting
  - [ ] Verificar audit logs en Supabase

- [ ] **Configurar alertas en Sentry**
  - [ ] Alerta: > 10 errores en 1 hora
  - [ ] Alerta: Errores en workflows críticos
  - [ ] Alerta: Performance issues (p95 > 2s)

- [ ] **Configurar limpieza de logs**
  - [ ] Setup cron job para `cleanup_old_audit_logs()`
  - [ ] Verificar rotación de log files

---

## 📊 Monitoreo en Producción

### Sentry Dashboard

1. **Issues**: Errores agrupados con frecuencia y stack traces
2. **Performance**: Transacciones lentas, queries N+1
3. **Replays**: Video de sesiones con errores
4. **Releases**: Tracking de deployments

### Logs

```bash
# Ver logs de producción
tail -f logs/application-2025-10-24.log

# Ver solo errores
tail -f logs/error-2025-10-24.log

# Filtrar por evento
cat logs/application-*.log | grep "quotation_created"
```

### Audit Logs

```sql
-- Dashboard en Supabase SQL Editor

-- Resumen de eventos por categoría
SELECT * FROM audit_logs_summary
ORDER BY count DESC;

-- Errores recientes
SELECT * FROM recent_errors
LIMIT 50;

-- Actividad de hoy
SELECT
  event_category,
  COUNT(*) as count
FROM audit_logs
WHERE created_at > CURRENT_DATE
GROUP BY event_category;

-- Timeline de una quotation
SELECT
  created_at,
  event_type,
  action,
  status,
  metadata
FROM audit_logs
WHERE resource_type = 'quotation_request'
  AND resource_id = 'your-quotation-id'
ORDER BY created_at;
```

---

## 🎯 Próximos Pasos

Una vez en producción con estas features base, continuar con:

### Priority 2 - Core Integrations (Month 2)
- [ ] Odoo ERP connector
- [ ] WhatsApp Business API
- [ ] PDF technical documents processing
- [ ] Provider scoring system

### Priority 3 - Advanced Features (Month 3)
- [ ] Provider portal (MVP)
- [ ] Multi-currency support
- [ ] Price benchmarking
- [ ] Mobile notifications

Ver `PRODUCT_ROADMAP_V2.md` para el roadmap completo.

---

## 🆘 Troubleshooting

### Logs no aparecen en archivos
- Verificar que `NODE_ENV=production`
- Verificar permisos de directorio `logs/`
- Verificar que Winston está importado correctamente

### Sentry no captura errores
- Verificar DSN configurado correctamente
- Verificar que `NODE_ENV=production` o `SENTRY_TEST_MODE=true`
- Verificar red no bloquea sentry.io

### Rate limiter causa timeouts
- Ajustar `reservoir` y `minTime` en `lib/rate-limiter.ts`
- Verificar prioridades de jobs
- Monitorear con `getLimiterStatus()`

### Audit logs no se guardan
- Verificar migración aplicada
- Verificar RLS policies
- Verificar `SUPABASE_SERVICE_ROLE_KEY` configurado

---

## 📞 Soporte

Para issues o preguntas:
1. Verificar logs de Sentry
2. Verificar audit logs en Supabase
3. Verificar logs de aplicación
4. Crear issue en repositorio con contexto completo

---

**Última actualización**: 2025-10-24
**Versión**: 1.0 - Production Monitoring Suite
