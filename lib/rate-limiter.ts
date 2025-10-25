/**
 * ⏱️ RATE LIMITING SERVICE
 * Controla la tasa de requests a APIs externas para evitar límites y costos
 */

import Bottleneck from 'bottleneck';
import { log } from './logger';

/**
 * Rate Limiter Configuration
 */
interface RateLimiterConfig {
  maxConcurrent: number; // Máximo de requests concurrentes
  minTime: number; // Tiempo mínimo entre requests (ms)
  reservoir?: number; // Máximo de requests en el periodo
  reservoirRefreshAmount?: number; // Cantidad a reponer
  reservoirRefreshInterval?: number; // Intervalo de reposición (ms)
}

/**
 * Create a rate limiter with specific configuration
 */
function createLimiter(name: string, config: RateLimiterConfig): Bottleneck {
  const limiter = new Bottleneck({
    maxConcurrent: config.maxConcurrent,
    minTime: config.minTime,
    reservoir: config.reservoir,
    reservoirRefreshAmount: config.reservoirRefreshAmount,
    reservoirRefreshInterval: config.reservoirRefreshInterval,
  });

  // Log events
  limiter.on('failed', async (error, jobInfo) => {
    log.warn(`[${name}] Request failed, will retry`, {
      error: error.message,
      retryCount: jobInfo.retryCount,
    });
  });

  limiter.on('retry', (error, jobInfo) => {
    log.info(`[${name}] Retrying request`, {
      retryCount: jobInfo.retryCount,
    });
  });

  limiter.on('depleted', () => {
    log.warn(`[${name}] Rate limit reservoir depleted, requests will be queued`);
  });

  return limiter;
}

/**
 * GOOGLE PLACES API LIMITER
 *
 * Limits:
 * - Text Search: $0.032 per request
 * - Place Details: $0.017 per request
 * - Geocoding: $0.005 per request
 *
 * Budget control: 100 requests per minute (ajustable)
 */
export const googlePlacesLimiter = createLimiter('GooglePlaces', {
  maxConcurrent: 5, // Max 5 requests concurrentes
  minTime: 200, // Mínimo 200ms entre requests (300 req/min max)
  reservoir: 100, // Máximo 100 requests por minuto
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000, // Cada minuto
});

/**
 * OPENAI API LIMITER
 *
 * Limits (GPT-4):
 * - 10,000 tokens per minute (TPM)
 * - 500 requests per minute (RPM)
 *
 * Limits (GPT-4o-mini):
 * - 200,000 TPM
 * - 500 RPM
 */
export const openaiLimiter = createLimiter('OpenAI', {
  maxConcurrent: 10, // Max 10 requests concurrentes
  minTime: 150, // Mínimo 150ms entre requests (400 req/min max)
  reservoir: 450, // Máximo 450 requests por minuto (buffer de seguridad)
  reservoirRefreshAmount: 450,
  reservoirRefreshInterval: 60 * 1000, // Cada minuto
});

/**
 * GMAIL API LIMITER
 *
 * Limits:
 * - 250 quota units per user per second
 * - Each send = 100 units
 * - Each read = 5 units
 */
export const gmailLimiter = createLimiter('Gmail', {
  maxConcurrent: 3, // Max 3 requests concurrentes
  minTime: 500, // Mínimo 500ms entre requests
  reservoir: 100, // Máximo 100 operaciones por minuto
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000,
});

/**
 * WEB SCRAPING LIMITER
 * Para extracción de emails de websites
 */
export const webScrapingLimiter = createLimiter('WebScraping', {
  maxConcurrent: 5, // Max 5 requests concurrentes
  minTime: 1000, // Mínimo 1s entre requests (para no saturar sitios)
  reservoir: 50, // Máximo 50 sitios por minuto
  reservoirRefreshAmount: 50,
  reservoirRefreshInterval: 60 * 1000,
});

/**
 * Helper function to wrap async functions with rate limiting
 */
export async function withRateLimit<T>(
  limiter: Bottleneck,
  fn: () => Promise<T>,
  options?: {
    priority?: number; // 0-9, mayor = más prioridad
    weight?: number; // Peso del job (default 1)
    expiration?: number; // Tiempo máximo en ms antes de expirar
  }
): Promise<T> {
  return limiter.schedule(
    {
      priority: options?.priority ?? 5,
      weight: options?.weight ?? 1,
      expiration: options?.expiration,
    },
    fn
  );
}

/**
 * Get current limiter status
 */
export function getLimiterStatus(limiter: Bottleneck) {
  return {
    running: limiter.running(),
    queued: limiter.queued(),
    // @ts-ignore - counts() exists but not in types
    counts: limiter.counts(),
  };
}

/**
 * Log all limiters status (for monitoring)
 */
export function logLimitersStatus() {
  const limiters = {
    'Google Places': googlePlacesLimiter,
    'OpenAI': openaiLimiter,
    'Gmail': gmailLimiter,
    'Web Scraping': webScrapingLimiter,
  };

  Object.entries(limiters).forEach(([name, limiter]) => {
    const status = getLimiterStatus(limiter);
    log.debug(`Rate Limiter Status: ${name}`, status);
  });
}

export default {
  googlePlacesLimiter,
  openaiLimiter,
  gmailLimiter,
  webScrapingLimiter,
  withRateLimit,
  getLimiterStatus,
  logLimitersStatus,
};
