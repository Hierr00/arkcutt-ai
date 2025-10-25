/**
 * 📧 EMAIL EXTRACTOR SERVICE
 * Extrae emails de contacto desde websites de proveedores
 */

import { log } from '@/mastra';
import { openai } from '@/lib/llm';
import { webScrapingLimiter, openaiLimiter, withRateLimit } from '@/lib/rate-limiter';

/**
 * Extrae el email de contacto desde una website
 */
export async function extractEmailFromWebsite(
  websiteUrl: string
): Promise<string | null> {
  try {
    log('debug', `🔍 Extrayendo email de: ${websiteUrl}`);

    // 1. Fetch del HTML
    const html = await fetchWebsiteHTML(websiteUrl);
    if (!html) {
      log('warn', '⚠️ No se pudo obtener HTML');
      return null;
    }

    // 2. Buscar emails con regex
    const emailsFound = extractEmailsFromHTML(html);

    if (emailsFound.length === 0) {
      log('warn', '⚠️ No se encontraron emails en la página');
      return null;
    }

    log('debug', `✅ Encontrados ${emailsFound.length} emails candidatos`);

    // 3. Si hay solo uno, retornarlo
    if (emailsFound.length === 1) {
      log('info', `✅ Email encontrado: ${emailsFound[0]}`);
      return emailsFound[0];
    }

    // 4. Si hay varios, usar LLM para identificar el principal
    const primaryEmail = await identifyPrimaryEmail(emailsFound, html, websiteUrl);

    log('info', `✅ Email principal identificado: ${primaryEmail}`);
    return primaryEmail;

  } catch (error: any) {
    log('error', '❌ Error extrayendo email', {
      url: websiteUrl,
      error: error.message
    });
    return null;
  }
}

/**
 * Fetch HTML de una website con timeout
 */
async function fetchWebsiteHTML(url: string): Promise<string | null> {
  try {
    // Fetch con rate limiting para no saturar sitios
    const response = await withRateLimit(
      webScrapingLimiter,
      async () => {
        // Timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        clearTimeout(timeoutId);
        return res;
      },
      { priority: 5 } // Prioridad media
    );

    if (!response.ok) {
      log('warn', `⚠️ HTTP ${response.status} al obtener ${url}`);
      return null;
    }

    const html = await response.text();

    // Limitar tamaño (máximo 100KB para no saturar LLM)
    if (html.length > 100000) {
      return html.substring(0, 100000);
    }

    return html;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      log('warn', '⚠️ Timeout al obtener HTML');
    }
    return null;
  }
}

/**
 * Extrae todos los emails del HTML usando regex
 */
function extractEmailsFromHTML(html: string): string[] {
  // Regex para emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = html.match(emailRegex) || [];

  // Filtrar emails comunes de spam/tracking
  const filtered = matches.filter(email => {
    const lower = email.toLowerCase();
    return (
      !lower.includes('example.com') &&
      !lower.includes('yourdomain.com') &&
      !lower.includes('placeholder') &&
      !lower.includes('noreply') &&
      !lower.includes('no-reply') &&
      !lower.includes('sentry') &&
      !lower.includes('wixpress') &&
      !lower.includes('facebook') &&
      !lower.includes('google') &&
      !lower.includes('twitter')
    );
  });

  // Remover duplicados
  return Array.from(new Set(filtered));
}

/**
 * Usa LLM para identificar el email de contacto principal
 */
async function identifyPrimaryEmail(
  emails: string[],
  html: string,
  websiteUrl: string
): Promise<string> {
  try {
    // Extraer contexto alrededor de cada email
    const emailsWithContext = emails.map(email => {
      const index = html.indexOf(email);
      if (index === -1) return { email, context: '' };

      const start = Math.max(0, index - 200);
      const end = Math.min(html.length, index + 200);
      const context = html.substring(start, end)
        .replace(/<[^>]*>/g, ' ') // Remover tags HTML
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();

      return { email, context };
    });

    const prompt = `Analiza estos emails encontrados en ${websiteUrl} y determina cuál es el email de contacto PRINCIPAL de la empresa.

EMAILS ENCONTRADOS:
${emailsWithContext.map((e, i) => `${i + 1}. ${e.email}\n   Contexto: "${e.context}"`).join('\n\n')}

CRITERIOS:
- Prioriza emails como "info@", "contacto@", "contact@", "ventas@", "comercial@"
- Evita emails personales o de departamentos específicos (marketing@, rrhh@)
- Busca el email que aparece en secciones de "contacto" o "footer"
- Si hay dudas, elige el más genérico

Responde SOLO con el email seleccionado, sin explicaciones.`;

    const response = await withRateLimit(
      openaiLimiter,
      () => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
      { priority: 5 } // Prioridad media
    );

    const selectedEmail = response.choices[0].message.content?.trim() || emails[0];

    // Validar que el email retornado esté en la lista
    const validEmail = emails.find(e => selectedEmail.includes(e));
    return validEmail || emails[0];

  } catch (error: any) {
    log('warn', '⚠️ Error con LLM, usando primer email', { error: error.message });
    return emails[0];
  }
}

/**
 * Extrae múltiples emails en paralelo (máximo 5 a la vez)
 */
export async function extractEmailsFromWebsites(
  websites: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Procesar en lotes de 5
  const batchSize = 5;
  for (let i = 0; i < websites.length; i += batchSize) {
    const batch = websites.slice(i, i + batchSize);

    const promises = batch.map(async (website) => {
      const email = await extractEmailFromWebsite(website);
      results.set(website, email);
    });

    await Promise.all(promises);
  }

  return results;
}
