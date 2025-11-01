# 🔍 DEBUG: Error 401 en Fin Custom Action

## Problema
Fin está recibiendo error 401 (Unauthorized) al llamar al endpoint `/api/fin/classify-and-route`.

## Posibles Causas

1. ❌ Variable `FIN_API_TOKEN` no configurada en Vercel
2. ❌ Variable `FIN_API_TOKEN` tiene formato incorrecto (espacios, saltos de línea)
3. ❌ Header `Authorization` no se envía correctamente desde Fin
4. ❌ Formato del header incorrecto en Fin Custom Action
5. ❌ Token diferente en Vercel vs el configurado en Fin

---

## 🧪 PASO 1: Verificar que el endpoint funciona localmente

### Opción A: Usando PowerShell

```powershell
# Ejecutar el script de test
.\scripts\test-fin-endpoint.ps1

# O testear tu URL de Vercel
.\scripts\test-fin-endpoint.ps1 "https://tu-app.vercel.app"
```

### Opción B: Usando curl (Git Bash o WSL)

```bash
# Test básico
curl -X POST https://tu-app.vercel.app/api/fin/classify-and-route \
  -H "Authorization: Bearer YOUR_FIN_API_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "subject": "Presupuesto",
    "body": "Necesito presupuesto",
    "thread_id": "test-123",
    "has_attachments": false
  }'
```

**Resultado esperado:** HTTP 200 con JSON de routing decision

**Si falla:** Continuar al siguiente paso

---

## 🔧 PASO 2: Verificar Variable en Vercel

### Checklist:

1. **Ir a Vercel Dashboard**
   - https://vercel.com/tu-usuario/arkcutt-ai
   - Settings → Environment Variables

2. **Verificar que existe `FIN_API_TOKEN`**
   ```
   Name: FIN_API_TOKEN
   Value: YOUR_FIN_API_TOKEN_HERE
   ```

3. **Verificar que NO tiene:**
   - ❌ Espacios al inicio o final
   - ❌ Saltos de línea
   - ❌ Comillas ("" o '')
   - ❌ Prefijo "Bearer "

4. **Verificar que está en los ambientes correctos:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Si cambiaste la variable:**
   - Necesitas **REDEPLOY** el proyecto
   - Deployments → Latest → "Redeploy"

---

## 🐛 PASO 3: Usar Debug Endpoint

### 3.1. Hacer deploy del debug endpoint

```bash
# Commit y push el debug endpoint
git add app/api/fin/debug/route.ts
git commit -m "feat: Add debug endpoint for Fin troubleshooting"
git push origin feat/fin-intercom-integration
```

Espera que Vercel despliegue (1-2 minutos).

### 3.2. Testear debug endpoint desde tu navegador

Abre en tu navegador:
```
https://tu-app.vercel.app/api/fin/debug
```

Deberías ver algo como:
```json
{
  "status": "Debug endpoint is working",
  "timestamp": "2025-11-01T...",
  "env_token_exists": true,
  "env_token_preview": "dG9rOjUxZTI5NmVjXzhhZjFf..."
}
```

**Si `env_token_exists` es `false`:**
→ El token NO está configurado en Vercel o el deployment no se actualizó

**Si `env_token_preview` es diferente:**
→ El token en Vercel es diferente al que estás usando

### 3.3. Testear desde Fin temporalmente

En Fin, cambia temporalmente el endpoint a:
```
https://tu-app.vercel.app/api/fin/debug
```

Haz un test desde Fin y mira la respuesta. Te mostrará exactamente qué headers está enviando Fin.

---

## 🎯 PASO 4: Verificar Configuración en Fin Custom Action

### En Intercom → Fin → Custom Actions

Verifica que la configuración sea EXACTAMENTE así:

#### URL
```
https://tu-app.vercel.app/api/fin/classify-and-route
```

#### Method
```
POST
```

#### Headers
```
Authorization: Bearer YOUR_FIN_API_TOKEN_HERE
Content-Type: application/json
```

⚠️ **IMPORTANTE:** El formato debe ser:
- Header name: `Authorization`
- Header value: `Bearer dG9rOjUx...` (con espacio después de "Bearer")

#### Body
```json
{
  "from": "{{user.email}}",
  "subject": "{{conversation.subject}}",
  "body": "{{conversation.body}}",
  "thread_id": "{{conversation.id}}",
  "has_attachments": {{conversation.has_attachments}}
}
```

---

## 🔍 PASO 5: Revisar Logs de Vercel

1. Ve a Vercel Dashboard
2. Deployments → Latest deployment
3. Click en "View Function Logs"
4. Busca logs de `/api/fin/classify-and-route`

Busca líneas que contengan:
- `[classify-and-route]`
- Status codes (200, 401, 400)
- Errores

---

## ❓ Problemas Comunes

### Error: "Invalid email"
**Causa:** Zod validation falla
**Solución:** Verifica que `from` sea un email válido

### Error: "Unauthorized" (401)
**Causa:** Token no coincide
**Solución:**
1. Verifica que FIN_API_TOKEN en Vercel sea EXACTO
2. Redeploy después de cambiar la variable
3. Verifica que el header en Fin tenga formato correcto

### Error: CORS
**Causa:** Intercom está siendo bloqueado por CORS
**Solución:** Añadir headers CORS al endpoint (no debería ser necesario)

### Error: Timeout
**Causa:** Endpoint tarda >3 segundos
**Solución:** Optimizar queries de DB o aumentar timeout en Fin

---

## 🧪 Test Rápido (Copiar y Pegar)

### Test desde PowerShell:

```powershell
$token = $env:FIN_API_TOKEN  # Debe estar configurado en tu .env.local
$url = "https://arkcutt-ai.vercel.app"  # Cambia por tu URL

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    from = "test@example.com"
    subject = "Presupuesto"
    body = "Necesito cotización"
    thread_id = "test-123"
    has_attachments = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "$url/api/fin/classify-and-route" -Method Post -Headers $headers -Body $body
```

**Si esto funciona pero Fin da 401:**
→ El problema está en cómo Fin envía el header

**Si esto también da 401:**
→ El problema está en la variable de Vercel

---

## ✅ Solución Paso a Paso

1. **Verifica variable en Vercel:**
   - Settings → Environment Variables
   - FIN_API_TOKEN debe ser exacto (sin espacios, sin comillas)

2. **Redeploy:**
   - Deployments → Latest → "Redeploy"
   - Espera 1-2 minutos

3. **Test con PowerShell:**
   - Ejecuta el comando de arriba
   - Debe devolver HTTP 200

4. **Test debug endpoint desde Fin:**
   - Cambia temporalmente URL a `/api/fin/debug`
   - Verifica qué headers envía Fin
   - Vuelve a `/api/fin/classify-and-route`

5. **Verifica formato header en Fin:**
   - Debe ser: `Authorization: Bearer TOKEN`
   - Con espacio después de "Bearer"
   - Sin comillas

---

## 📞 Si Nada Funciona

Comparte:
1. Screenshot de la configuración del Custom Action en Fin
2. Output del comando PowerShell de test
3. Output del debug endpoint (GET)
4. Logs de Vercel de la última request

Y te ayudaré a encontrar el problema exacto.
