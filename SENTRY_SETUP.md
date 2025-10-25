# 🔍 Sentry Setup Guide

Este documento explica cómo configurar Sentry para el monitoreo de errores en producción.

## 📋 Prerequisitos

1. Crear una cuenta en [Sentry.io](https://sentry.io/)
2. Crear un nuevo proyecto en Sentry (seleccionar "Next.js")

## 🔑 Variables de Entorno

Añade las siguientes variables a tu archivo `.env.local` (desarrollo) y a tu hosting (producción):

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug

# Optional: Auth token for uploading source maps
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Test Sentry in development
# SENTRY_TEST_MODE=true
```

### Cómo obtener estos valores:

1. **NEXT_PUBLIC_SENTRY_DSN**:
   - Ve a Settings > Projects > [Tu Proyecto] > Client Keys (DSN)
   - Copia el DSN público

2. **SENTRY_ORG**:
   - Ve a Settings > General
   - Copia tu "Organization Slug"

3. **SENTRY_PROJECT**:
   - Ve a Settings > Projects > [Tu Proyecto]
   - Copia el "Project Slug"

4. **SENTRY_AUTH_TOKEN**:
   - Ve a Settings > Auth Tokens
   - Create New Token con permisos: `project:releases` y `org:read`

## 🧪 Testing

### Probar en desarrollo (opcional):

```bash
# En .env.local
SENTRY_TEST_MODE=true
```

Luego ejecuta:
```bash
npx tsx scripts/test-sentry.js
```

### Probar en producción:

1. Despliega la aplicación
2. Visita: `https://tu-dominio.com/api/test-sentry`
3. Verifica en el dashboard de Sentry que el error aparece

## 📊 Features Incluidas

### ✅ Error Tracking
- Errores de cliente (browser)
- Errores de servidor (API routes, SSR)
- Errores en Edge runtime (middleware)

### ✅ Performance Monitoring
- Tracing de requests HTTP
- Performance de páginas
- API route performance

### ✅ Session Replay
- Grabación de sesiones con errores
- 10% de sesiones normales grabadas
- Datos sensibles enmascarados

### ✅ Integración con Logger
- Errores automáticamente enviados a Sentry
- Warnings enviados en producción
- Metadata contextual incluida

### ✅ Source Maps
- Source maps subidos automáticamente en build
- Stack traces legibles en producción
- Source maps ocultos del público

## 🔒 Seguridad

El sistema ya incluye:
- ✅ Headers de autorización eliminados
- ✅ Query params sensibles sanitizados
- ✅ Cookies removidos
- ✅ Texto y media enmascarados en replays
- ✅ Source maps ocultos del cliente

## 📈 Monitoreo en Producción

Una vez configurado, Sentry capturará automáticamente:

1. **Errores no controlados**:
   - Excepciones en React
   - Errores en API routes
   - Errores de red

2. **Errores controlados vía logger**:
   ```typescript
   log('error', 'Failed to process order', {
     orderId: 123,
     error: new Error('Database connection failed')
   });
   ```

3. **Performance issues**:
   - Queries lentas
   - Renders lentos
   - API calls lentos

## 🚨 Alertas

Configura alertas en Sentry:
1. Ve a Alerts > Create Alert
2. Selecciona condiciones (ej: más de 10 errores en 1 hora)
3. Configura notificaciones (email, Slack, etc.)

## 🎯 Vercel Integration (opcional)

Si usas Vercel:
1. Ve a tu proyecto en Vercel
2. Settings > Integrations
3. Busca "Sentry" y conecta
4. Las variables se configurarán automáticamente

## 📝 Next Steps

Después de configurar Sentry:
1. [ ] Configurar alertas para errores críticos
2. [ ] Configurar Slack integration
3. [ ] Crear dashboards personalizados
4. [ ] Configurar issue assignment rules
5. [ ] Setup performance thresholds
