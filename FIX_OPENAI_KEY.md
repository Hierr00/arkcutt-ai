# 🔑 Cómo Arreglar la API Key de OpenAI

## Problema Actual

Tu `.env.local` tiene una API key inválida:
```
OPENAI_API_KEY=sk-proj-****************_KEY
```

## ✅ Solución Paso a Paso

### Opción 1: Obtener una API Key Real de OpenAI

1. **Ve a OpenAI**
   - Abre: https://platform.openai.com/api-keys
   - Inicia sesión (crea cuenta si no tienes)

2. **Crear API Key**
   - Click en "Create new secret key"
   - Dale un nombre: "Arkcutt AI Development"
   - Copia la key (empieza con `sk-proj-...`)

3. **Actualizar `.env.local`**
   ```bash
   # Reemplaza esta línea en .env.local:
   OPENAI_API_KEY=sk-proj-TU_KEY_REAL_AQUI_SIN_ESPACIOS
   ```

4. **Reiniciar Servidor**
   ```bash
   # Ctrl+C para detener
   npm run dev
   ```

### Opción 2: Usar el Sistema sin OpenAI (Solo Reglas)

Si no quieres usar OpenAI por ahora, puedo modificar el sistema para que funcione solo con reglas deterministas (sin LLM). Esto significa:

- ✅ Funcionará el sistema de reglas
- ✅ Detectará saludos, consultas simples
- ❌ No podrá responder consultas complejas
- ❌ No usará los agentes especializados

¿Quieres que lo configure así temporalmente?

---

## 💡 Notas Importantes

### Sobre Costos
- OpenAI cobra por uso (tokens)
- Modelo GPT-4o: ~$0.005 por 1000 tokens
- Modelo GPT-4o-mini: ~$0.0015 por 1000 tokens
- Para desarrollo: unos pocos dólares al mes
- Necesitas agregar créditos en: https://platform.openai.com/settings/organization/billing

### Sobre la Key
- **NO compartas tu key** - es como una contraseña
- **NO la subas a Git** - `.env.local` ya está en `.gitignore`
- Puedes regenerarla en cualquier momento en OpenAI

---

## 🧪 Verificar que Funciona

Una vez tengas la key correcta:

1. Reinicia el servidor: `npm run dev`
2. Abre http://localhost:3001
3. Escribe "Hola"
4. Deberías ver en los logs:
   ```
   ✅ Rule-based match: GREETING
   ```
5. Para consultas más complejas, el LLM se usará automáticamente

---

## ❓ ¿Necesitas Ayuda?

Si no tienes tarjeta de crédito para OpenAI o prefieres no usarla todavía, puedo:

1. Configurar el sistema para usar solo reglas (sin LLM)
2. Mostrarte cómo usar un servicio alternativo gratuito
3. Crear una versión de demostración sin IA

¿Qué prefieres?
