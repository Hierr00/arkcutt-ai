# 📧 Implementación Futura: Gmail Webhook (Tiempo Real)

**Estado:** 📋 Planificado (No implementado)
**Prioridad:** Media (después de deployment inicial)
**Tiempo estimado:** 2-3 horas

---

## 🎯 Objetivo

Reemplazar el cron job (cada 5 minutos) con un sistema de notificaciones push de Gmail que procese emails **instantáneamente** cuando llegan.

---

## 📊 Comparación: Cron Job vs Webhook

### Sistema Actual (Cron Job)
```
✅ Simple de implementar
✅ Ya está funcionando
✅ Confiable
❌ Retraso de hasta 5 minutos
❌ Verifica inbox aunque no haya emails (desperdicia recursos)
❌ Requiere Vercel Pro ($20/mes)
```

### Sistema Propuesto (Webhook)
```
✅ Procesamiento instantáneo (< 10 segundos)
✅ Solo se ejecuta cuando llegan emails (ahorra recursos)
✅ Funciona en Vercel FREE
✅ Más profesional
❌ Más complejo de configurar
❌ Requiere endpoint público HTTPS
```

---

## 🏗️ Arquitectura del Webhook

```
Gmail recibe email
    ↓
Gmail Pub/Sub push notification
    ↓
POST https://tu-app.vercel.app/api/webhooks/gmail
    ↓
Procesar email automáticamente
    ↓
Crear RFQ en base de datos
```

---

## 📋 Pasos de Implementación

### 1. Configurar Google Cloud Pub/Sub (30 mins)

#### 1.1 Crear Topic
```bash
# En Google Cloud Console
gcloud pubsub topics create gmail-notifications
```

#### 1.2 Configurar Gmail Push Notifications
```bash
# Dar permisos a Gmail para publicar
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

#### 1.3 Configurar Watch en Gmail API
```typescript
// scripts/setup-gmail-webhook.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Configurar watch
const response = await gmail.users.watch({
  userId: 'me',
  requestBody: {
    topicName: 'projects/YOUR_PROJECT_ID/topics/gmail-notifications',
    labelIds: ['INBOX'], // Solo monitorear INBOX
  },
});

console.log('Watch configurado:', response.data);
// historyId: usar para tracking
// expiration: renovar cada 7 días
```

### 2. Crear Suscripción Push (15 mins)

```bash
# Crear suscripción que envíe POST a tu API
gcloud pubsub subscriptions create gmail-webhook-subscription \
  --topic=gmail-notifications \
  --push-endpoint=https://tu-app.vercel.app/api/webhooks/gmail \
  --push-auth-service-account=YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com
```

### 3. Crear Endpoint de Webhook (45 mins)

```typescript
// app/api/webhooks/gmail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { quotationCoordinator } from '@/lib/agents/quotation-coordinator.agent';
import { log } from '@/mastra';

/**
 * 📧 Webhook de Gmail Push Notifications
 * Se ejecuta INMEDIATAMENTE cuando llega un email
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación de Google Pub/Sub
    const body = await request.json();

    // Pub/Sub envía el mensaje en formato base64
    const pubsubMessage = body.message;
    if (!pubsubMessage) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 2. Decodificar mensaje
    const data = JSON.parse(
      Buffer.from(pubsubMessage.data, 'base64').toString('utf-8')
    );

    log('info', '📬 Gmail Webhook recibido:', data);

    // 3. Verificar que es un email nuevo (no actualización)
    if (data.historyId) {
      // 4. Procesar solo emails NUEVOS usando historyId
      const result = await quotationCoordinator.processNewEmailsFromHistoryId(
        data.historyId
      );

      log('info', '✅ Email procesado desde webhook', result);

      // 5. Responder a Pub/Sub (debe ser 200 OK rápido)
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, skipped: 'No new emails' });
  } catch (error: any) {
    log('error', '❌ Error en webhook de Gmail:', error.message);

    // IMPORTANTE: Siempre responder 200 para que Pub/Sub no reintente
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 200 });
  }
}

// Verificación de Pub/Sub (cuando configuras por primera vez)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'Gmail webhook endpoint ready' });
}
```

### 4. Actualizar Coordinador de Quotations (30 mins)

```typescript
// lib/agents/quotation-coordinator.agent.ts

/**
 * Procesa emails nuevos desde un historyId específico
 * Usado por el webhook para procesar solo emails nuevos
 */
async processNewEmailsFromHistoryId(historyId: string) {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 1. Obtener cambios desde el historyId
    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    });

    if (!history.data.history || history.data.history.length === 0) {
      return { processed: 0, message: 'No new emails' };
    }

    // 2. Extraer IDs de mensajes nuevos
    const newMessageIds: string[] = [];
    for (const record of history.data.history) {
      if (record.messagesAdded) {
        for (const added of record.messagesAdded) {
          if (added.message?.id) {
            newMessageIds.push(added.message.id);
          }
        }
      }
    }

    log('info', `📨 ${newMessageIds.length} emails nuevos detectados`);

    // 3. Procesar cada email nuevo
    const results = [];
    for (const messageId of newMessageIds) {
      const result = await this.processEmailById(messageId);
      results.push(result);
    }

    return {
      processed: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  } catch (error: any) {
    log('error', '❌ Error procesando emails desde historyId:', error.message);
    throw error;
  }
}

/**
 * Procesa un email específico por su ID
 */
async processEmailById(messageId: string) {
  // Implementación similar a processNewEmails() pero para un solo email
  // ...código de procesamiento...
}
```

### 5. Renovar Watch Automáticamente (15 mins)

Gmail watch expira cada 7 días, necesitas renovarlo:

```typescript
// app/api/cron/renew-gmail-watch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

/**
 * 🔄 Renueva el Gmail watch cada 7 días
 * Configurar cron en vercel.json:
 * "schedule": "0 0 * * 0" (cada domingo)
 */
export async function GET(request: NextRequest) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Renovar watch
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: process.env.GMAIL_PUBSUB_TOPIC,
        labelIds: ['INBOX'],
      },
    });

    console.log('✅ Gmail watch renovado:', response.data);

    return NextResponse.json({
      success: true,
      expiration: response.data.expiration,
    });
  } catch (error: any) {
    console.error('❌ Error renovando watch:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

```json
// vercel.json (añadir)
{
  "crons": [
    {
      "path": "/api/cron/renew-gmail-watch",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

---

## 🔐 Seguridad

### Validar Requests de Pub/Sub

```typescript
// lib/security/pubsub-auth.ts
import { NextRequest } from 'next/server';

/**
 * Verifica que el request viene de Google Pub/Sub
 */
export function verifyPubSubRequest(request: NextRequest): boolean {
  // Opción 1: Verificar token de autenticación
  const authHeader = request.headers.get('authorization');
  // Google envía un JWT, puedes verificarlo

  // Opción 2: Verificar que viene de Google Cloud
  const userAgent = request.headers.get('user-agent');
  if (!userAgent?.includes('Google-Cloud-Pub-Sub')) {
    return false;
  }

  return true;
}
```

---

## 📊 Migración del Sistema Actual

### Paso 1: Implementar en paralelo
- ✅ Mantener cron job funcionando
- ✅ Implementar webhook
- ✅ Testear con emails reales

### Paso 2: Monitorear ambos sistemas
- ✅ Comparar tiempos de respuesta
- ✅ Verificar que no se pierden emails
- ✅ Verificar que no se procesan duplicados

### Paso 3: Desactivar cron job
- ✅ Comentar cron en vercel.json
- ✅ Mantener endpoint por si acaso
- ✅ Monitorear 1 semana

### Paso 4: Eliminar cron job
- ✅ Eliminar endpoint
- ✅ Actualizar documentación

---

## 💰 Costos

### Google Cloud Pub/Sub
```
Primeros 10GB/mes: GRATIS
Después: $0.40 por millón de mensajes

Para emails típicos (< 1MB):
- 1000 emails/mes: $0.00 (gratis)
- 10,000 emails/mes: $0.04
- 100,000 emails/mes: $0.40

Prácticamente GRATIS para uso típico
```

### Vercel
```
Con webhook, puedes usar:
- Vercel FREE: $0/mes ✅
- Funciona perfectamente sin cron jobs
```

**Ahorro total: $20/mes** (no necesitas Vercel Pro)

---

## 🧪 Testing

### Test Local (desarrollo)
```bash
# Simular webhook con curl
curl -X POST http://localhost:3000/api/webhooks/gmail \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "data": "'$(echo '{"emailAddress":"me@gmail.com","historyId":"123456"}' | base64)'",
      "messageId": "12345",
      "publishTime": "2025-10-30T10:00:00.000Z"
    }
  }'
```

### Test Producción
```bash
# Enviar email de prueba a tu cuenta
# Verificar que se procesa en < 10 segundos
# Revisar logs en Vercel
```

---

## 📚 Referencias

- [Gmail Push Notifications](https://developers.google.com/gmail/api/guides/push)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [Vercel Webhooks](https://vercel.com/docs/concepts/webhooks)

---

## ✅ Checklist de Implementación

- [ ] Crear Google Cloud Pub/Sub topic
- [ ] Configurar permisos IAM
- [ ] Configurar Gmail watch
- [ ] Crear endpoint webhook
- [ ] Crear suscripción push
- [ ] Implementar processNewEmailsFromHistoryId
- [ ] Implementar renovación automática watch
- [ ] Testing completo
- [ ] Migración gradual
- [ ] Desactivar cron job
- [ ] Actualizar documentación

---

**Tiempo estimado total:** 2-3 horas
**Prioridad:** Media (hacer después del launch inicial)
**Ahorro:** $20/mes (Vercel Pro ya no necesario)

---

**Última actualización:** 30 de Octubre, 2025
**Estado:** Planificado
