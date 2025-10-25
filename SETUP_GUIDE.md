# 🚀 Guía de Configuración - Arkcutt AI Agent

Esta guía te llevará paso a paso para configurar y desplegar el sistema de pre-cotización de Arkcutt.

---

## 📋 Pre-requisitos

- Cuenta de Google Workspace o Gmail
- Cuenta de Supabase (gratis)
- Cuenta de Vercel (gratis)
- Cuenta de Google Cloud Platform (gratis con $300 de crédito)
- Node.js 18+ instalado

---

## PASO 1: Configurar Base de Datos (Supabase)

### 1.1 Ejecutar Migración 005

```bash
# 1. Ir a Supabase Dashboard
https://supabase.com/dashboard

# 2. Seleccionar tu proyecto
# 3. Ir a "SQL Editor" en el menú lateral
# 4. Click en "New Query"
# 5. Copiar TODO el contenido de este archivo:
supabase/migrations/005_create_quotation_workflow.sql

# 6. Pegar en el editor
# 7. Click en "Run"
```

**Verificar que se crearon las tablas:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'quotation_requests',
    'external_quotations',
    'quotation_interactions',
    'guardrails_log',
    'provider_contacts'
  );
```

Deberías ver 5 tablas.

---

## PASO 2: Configurar Gmail API

### 2.1 Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Click en "Select a project" → "New Project"
3. Nombre: `arkcutt-ai-agent`
4. Click "Create"

### 2.2 Habilitar Gmail API

```bash
# En Google Cloud Console:
1. APIs & Services → Library
2. Buscar "Gmail API"
3. Click "Enable"
```

### 2.3 Configurar OAuth Consent Screen

```bash
1. APIs & Services → OAuth consent screen
2. User Type: External (o Internal si tienes Google Workspace)
3. App name: "Arkcutt AI Agent"
4. User support email: tu email
5. Developer contact: tu email
6. Scopes: Click "Add or Remove Scopes"
   - Buscar "Gmail API"
   - Seleccionar:
     ✅ https://www.googleapis.com/auth/gmail.readonly
     ✅ https://www.googleapis.com/auth/gmail.send
     ✅ https://www.googleapis.com/auth/gmail.modify
     ✅ https://www.googleapis.com/auth/gmail.labels
7. Test users: Añadir tu email
8. Click "Save and Continue"
```

### 2.4 Crear OAuth2 Credentials

```bash
1. APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Arkcutt Gmail Integration"
5. Authorized redirect URIs:
   - http://localhost:3000/api/auth/gmail/callback (desarrollo)
   - https://tu-dominio.vercel.app/api/auth/gmail/callback (producción)
6. Click "Create"
7. GUARDAR:
   - Client ID
   - Client Secret
```

### 2.5 Obtener Refresh Token

Crea un archivo temporal `get-gmail-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'TU_CLIENT_ID',
  'TU_CLIENT_SECRET',
  'http://localhost:3000/api/auth/gmail/callback'
);

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
  ],
});

console.log('Autoriza esta app visitando esta URL:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Ingresa el código de la URL de callback: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\n✅ REFRESH TOKEN:');
  console.log(tokens.refresh_token);
  console.log('\nGuarda esto en tu .env como GMAIL_REFRESH_TOKEN');
  rl.close();
});
```

Ejecutar:
```bash
node get-gmail-token.js
# 1. Abrir la URL que aparece
# 2. Autorizar la aplicación
# 3. Copiar el código de la URL de callback
# 4. Pegar el código en la terminal
# 5. GUARDAR el refresh_token que aparece
```

---

## PASO 3: Configurar Google Places API

### 3.1 Habilitar Places API

```bash
# En Google Cloud Console (mismo proyecto):
1. APIs & Services → Library
2. Buscar "Places API"
3. Click "Enable"
```

### 3.2 Crear API Key

```bash
1. APIs & Services → Credentials
2. Click "Create Credentials" → "API Key"
3. GUARDAR la API Key
4. Click en la key recién creada para editarla:
   - Application restrictions: None (o HTTP referrers para producción)
   - API restrictions: "Restrict key"
     ✅ Places API
     ✅ Geocoding API
5. Click "Save"
```

---

## PASO 4: Configurar Variables de Entorno

### 4.1 Crear `.env.local`

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# ===========================================
# ARKCUTT AI AGENT - ENVIRONMENT VARIABLES
# ===========================================

# --- DATABASE (Supabase) ---
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# --- OpenAI ---
OPENAI_API_KEY=sk-...

# --- Gmail API ---
GMAIL_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
GMAIL_REFRESH_TOKEN=1//... (el que obtuviste en PASO 2.5)

# --- Google Places API ---
GOOGLE_PLACES_API_KEY=AIza...

# --- Cron Job Security ---
CRON_SECRET=tu-secret-aleatorio-seguro

# --- Other ---
NODE_ENV=development
```

### 4.2 Configurar en Vercel

```bash
# Una vez que despliegues a Vercel:
1. Vercel Dashboard → Tu proyecto → Settings → Environment Variables
2. Añadir TODAS las variables del .env.local
3. IMPORTANTE: Cambiar GMAIL_REDIRECT_URI a:
   https://tu-dominio.vercel.app/api/auth/gmail/callback
```

---

## PASO 5: Instalar Dependencias

```bash
npm install

# Dependencias nuevas necesarias:
npm install @googlemaps/google-maps-services-js
npm install googleapis
```

---

## PASO 6: Testing Local

### 6.1 Iniciar servidor de desarrollo

```bash
npm run dev
```

### 6.2 Probar el cron job manualmente

```bash
# En otra terminal:
curl -X POST http://localhost:3000/api/cron/process-emails \
  -H "Authorization: Bearer tu-secret-aleatorio-seguro"
```

Deberías ver en los logs:
```
🔄 CRON JOB: Iniciando procesamiento de emails...
📬 Leyendo emails no leídos de Gmail...
✅ No hay emails nuevos para procesar (o los emails procesados)
```

### 6.3 Enviar email de prueba

1. Envía un email a la cuenta de Gmail configurada con asunto:
   ```
   Solicitud de presupuesto - 100 piezas de aluminio
   ```

2. Cuerpo del email:
   ```
   Hola,

   Necesito fabricar 100 piezas de aluminio 6061 con las siguientes especificaciones:
   - Tolerancias: ±0.1mm
   - Acabado: Anodizado negro
   - Entrega: 2 semanas

   Adjunto plano en PDF.

   Saludos,
   Cliente Test
   ```

3. Ejecutar el cron job otra vez:
   ```bash
   curl -X POST http://localhost:3000/api/cron/process-emails \
     -H "Authorization: Bearer tu-secret-aleatorio-seguro"
   ```

4. Verificar en Supabase:
   ```sql
   SELECT * FROM quotation_requests ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM guardrails_log ORDER BY created_at DESC LIMIT 1;
   ```

---

## PASO 7: Despliegue a Producción (Vercel)

### 7.1 Preparar repositorio

```bash
# Si no tienes git inicializado:
git init
git add .
git commit -m "Setup Arkcutt AI Agent production-ready"

# Subir a GitHub/GitLab:
git remote add origin https://github.com/tu-usuario/arkcutt-ai.git
git push -u origin main
```

### 7.2 Desplegar en Vercel

```bash
# Opción 1: CLI
npm install -g vercel
vercel login
vercel

# Opción 2: Dashboard
1. Ir a https://vercel.com/dashboard
2. Click "Add New Project"
3. Importar tu repositorio
4. Framework Preset: Next.js
5. Environment Variables: Añadir todas las del .env.local
6. Click "Deploy"
```

### 7.3 Configurar Cron Job en Vercel

El archivo `vercel.json` ya está configurado para ejecutar cada 5 minutos:
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

Vercel ejecutará automáticamente el cron job.

### 7.4 Verificar Deployment

```bash
# Verificar que el cron job funciona:
# En Vercel Dashboard → Tu proyecto → Functions → Cron Jobs
# Deberías ver "process-emails" ejecutándose cada 5 minutos
```

---

## PASO 8: Monitoreo y Logs

### 8.1 Ver logs en Vercel

```bash
# Vercel Dashboard → Tu proyecto → Functions
# Click en cualquier función para ver logs en tiempo real
```

### 8.2 Ver logs en Supabase

```sql
-- Ver últimas clasificaciones de emails
SELECT
  created_at,
  email_from,
  email_subject,
  decision,
  confidence,
  email_type
FROM guardrails_log
ORDER BY created_at DESC
LIMIT 10;

-- Ver quotation requests activas
SELECT
  id,
  status,
  customer_email,
  parts_description,
  missing_info,
  created_at
FROM quotation_requests
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 CHECKLIST FINAL

- [ ] Migración 005 ejecutada en Supabase (5 tablas creadas)
- [ ] Gmail API habilitada y configurada
- [ ] OAuth2 credentials creadas
- [ ] Refresh token obtenido
- [ ] Google Places API habilitada
- [ ] API Key de Places creada
- [ ] `.env.local` configurado con todas las variables
- [ ] Dependencias instaladas (`npm install`)
- [ ] Testing local exitoso (email procesado correctamente)
- [ ] Código subido a GitHub/GitLab
- [ ] Proyecto desplegado en Vercel
- [ ] Environment variables configuradas en Vercel
- [ ] Cron job funcionando (verificar en dashboard)
- [ ] Email de prueba procesado en producción

---

## 🆘 Troubleshooting

### Error: "Gmail API not enabled"
```bash
Solución: Ve a Google Cloud Console → APIs & Services → Library
Busca "Gmail API" y click "Enable"
```

### Error: "Invalid refresh token"
```bash
Solución: El refresh token expira o es inválido.
1. Borrar el refresh token de .env
2. Ejecutar get-gmail-token.js de nuevo
3. Actualizar .env con el nuevo token
```

### Error: "Quotation request not created"
```bash
Solución: Verificar que la migración 005 se ejecutó correctamente.
SELECT * FROM quotation_requests; -- Debe funcionar
```

### Error: "Provider email not sent"
```bash
Solución: Verificar que el proveedor tiene email en la BD.
Si es de Google Places, puede que no tenga email público.
```

### Emails no se procesan automáticamente
```bash
Solución: Verificar que el cron job está configurado en Vercel.
Vercel Dashboard → Functions → Cron Jobs
Debe aparecer "process-emails" con schedule "*/5 * * * *"
```

---

## 📊 Métricas de Éxito

Después de 1 semana de uso, deberías ver:

- **Emails procesados**: >90% clasificados correctamente
- **Tiempo de recopilación**: <2 horas (vs 2-3 días manual)
- **Quotations listas para humano**: >70% con toda la información
- **Proveedores contactados**: 2-3 por servicio externo
- **Tasa de respuesta de proveedores**: >50%

---

## 🚀 Próximos Pasos

Una vez que esto funcione:

1. **Week 2**: Implementar procesamiento de PDF/CAD
2. **Week 2**: Mejorar contacto automático con proveedores
3. **Week 2**: Crear dashboard para que humanos vean las quotations
4. **Week 3**: Refinar prompts y añadir más guardrails
5. **Week 4**: Entrenar al equipo y validar con clientes reales

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard
2. Verifica las tablas en Supabase
3. Consulta el PRODUCT_ROADMAP_V2.md para más detalles

**¡Buena suerte! 🚀**
