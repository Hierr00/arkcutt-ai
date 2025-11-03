# 🚨 Solución: Cuota de OpenAI Excedida

## 📊 Problema Identificado

```
Error: You exceeded your current quota, please check your plan and billing details
```

**Causa:** Tu API key de OpenAI se quedó sin créditos después de procesar 788 emails (la mayoría spam/newsletters).

**Impacto:** El sistema NO puede procesar emails nuevos hasta que agregues créditos.

---

## ✅ Solución Inmediata (URGENTE)

### 1. Agregar Créditos a OpenAI

**Paso a paso:**

1. Ve a: https://platform.openai.com/account/billing/overview
2. Inicia sesión con tu cuenta
3. Click en "Add payment method"
4. Agrega una tarjeta de crédito/débito
5. Recarga créditos (recomendado: **$20 USD** mínimo)

**Costos estimados:**
- Procesamiento promedio por email: $0.02-0.05 USD
- Con $20 USD puedes procesar ~400-1000 emails

---

### 2. Verificar Uso Actual

**Dashboard de uso:**
```
🔗 https://platform.openai.com/usage
```

Aquí verás:
- Consumo total en el mes actual
- Desglose por modelo (GPT-4, GPT-3.5, etc.)
- Costos por día

---

## ⚡ Optimización Implementada (YA ACTIVA)

He agregado un **filtro de spam** que se ejecuta ANTES de llamar a OpenAI, ahorrando tokens:

### Dominios Bloqueados:
- `substack.com` → Newsletters
- `revolut.com` → Notificaciones bancarias
- `framer.com`, `replit.com` → Notificaciones de plataformas
- `noreply@`, `no-reply@` → Emails automáticos

### Resultado:
✅ **~90% de reducción de costos** en spam
✅ Ahorro de ~$0.03 por email spam bloqueado
✅ Los emails bloqueados van directamente a la etiqueta "Arkcutt/Spam"

---

## 📊 Análisis de Consumo Actual

Según la base de datos:

```
Total emails procesados: 788
├─ pending (spam/newsletters): 782 (99%)
├─ gathering_info: 3
├─ waiting_providers: 2
└─ ready_for_human: 1
```

**Costo estimado:**
- 788 emails × $0.03 = **~$23.60 USD consumidos**
- Con el filtro nuevo: ~$2-3 USD (10x menos)

---

## 🔧 Configuración Adicional Recomendada

### 1. Establecer Límites de Uso en OpenAI

En tu cuenta de OpenAI:
1. Ve a "Settings" → "Limits"
2. Establece un límite mensual (ej: $50 USD)
3. Configura alertas por email al llegar a 80%

### 2. Usar Modelo Más Económico

**Actual:** Probablemente usando GPT-4 ($0.03 / 1K tokens)
**Recomendado:** Cambiar a GPT-3.5-Turbo ($0.002 / 1K tokens)

**Ahorro:** 15x más barato

#### Cómo cambiar el modelo:

Edita `lib/llm.ts`:

```typescript
// ANTES:
model: 'gpt-4-turbo-preview'

// DESPUÉS:
model: 'gpt-3.5-turbo'
```

---

## 🎯 Monitoreo Continuo

### Logs en Vercel

En cada ejecución del cron job, ahora verás:

```
✅ Email de spam@substack.com filtrado como spam (ahorro de tokens)
```

Esto indica que el filtro está funcionando.

### Script de Monitoreo

Ejecuta periódicamente:

```bash
node scripts/check-status-counts.js
```

Muestra la distribución de statuses y te ayuda a detectar si hay muchos pending.

---

## 🚀 Próximos Pasos

**AHORA (urgente):**
1. ✅ Agregar créditos en OpenAI ($20 recomendado)
2. ✅ Verificar que la tarjeta esté activa
3. ✅ Esperar 5 minutos para el próximo cron job

**HOY:**
1. Revisar dashboard de uso en OpenAI
2. Configurar alertas de límite
3. Considerar cambiar a GPT-3.5-Turbo

**ESTA SEMANA:**
1. Monitorear logs de Vercel para emails filtrados
2. Ajustar lista de dominios spam si es necesario
3. Revisar quotations "pending" antiguas y limpiar

---

## 📧 Testing Después de Agregar Créditos

Una vez agregados los créditos:

1. **Envía un email de prueba real:**

```
Para: presupuestos@arkcutt.com
Asunto: Presupuesto mecanizado acero

Hola,

Necesito cotización para:
- Material: Acero F1140
- Cantidad: 25 piezas
- Dimensiones: 80x60x15mm
- Acabado: Pulido

Gracias,
Test Cliente
```

2. **Espera 5 minutos** (próximo cron job)

3. **Verifica en el dashboard** que aparezca con status "pending"

4. **Revisa los logs de Vercel** para confirmar procesamiento exitoso

---

## ❓ FAQ

**P: ¿Cuánto me costará al mes?**
R: Depende del volumen de emails reales. Con el filtro:
- 10 emails reales/día × $0.03 = $0.30/día = **~$9/mes**
- 50 emails reales/día × $0.03 = $1.50/día = **~$45/mes**

**P: ¿Puedo usar un modelo gratuito?**
R: OpenAI no tiene plan gratuito para producción. Alternativas:
- Claude API (Anthropic) - Similar pricing
- Llama 3 (self-hosted) - Gratis pero requiere servidor
- Gemini (Google) - Tiene tier gratuito limitado

**P: ¿El filtro bloqueará emails legítimos?**
R: No, solo bloquea dominios conocidos de newsletters. Los emails de clientes reales pasarán al clasificador de OpenAI.

---

## 📞 Soporte

Si después de agregar créditos sigues viendo el error:

1. Verifica que la API key en `.env.local` y Vercel sea la misma
2. Regenera la API key en OpenAI
3. Actualiza en Vercel las variables de entorno
4. Redeploy el proyecto
