import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

// =====================================================
// CSRF Token Generation and Validation
// =====================================================

const CSRF_TOKEN_COOKIE_NAME = 'csrf-token';
const CSRF_TOKEN_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Generates a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Hashes a CSRF token for storage
 */
export function hashCsrfToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Gets or creates a CSRF token for the current session
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    token = generateCsrfToken();
    cookieStore.set(CSRF_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_EXPIRY / 1000, // convert to seconds
      path: '/',
    });
  }

  return token;
}

/**
 * Validates a CSRF token from request headers
 */
export async function validateCsrfToken(headerToken: string | null): Promise<boolean> {
  if (!headerToken) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  // Compare the tokens using constant-time comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Rotates the CSRF token (generates a new one)
 */
export async function rotateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const newToken = generateCsrfToken();

  cookieStore.set(CSRF_TOKEN_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000,
    path: '/',
  });

  return newToken;
}

/**
 * Deletes the CSRF token cookie
 */
export async function deleteCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_TOKEN_COOKIE_NAME);
}

// =====================================================
// CSRF Protection Middleware Helper
// =====================================================

/**
 * Checks if a request should be CSRF protected
 */
export function shouldProtectRequest(method: string, pathname: string): boolean {
  // Only protect state-changing methods
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!protectedMethods.includes(method.toUpperCase())) {
    return false;
  }

  // Don't protect webhooks and health checks
  const unprotectedPaths = ['/api/webhooks', '/api/health'];
  if (unprotectedPaths.some((path) => pathname.startsWith(path))) {
    return false;
  }

  return true;
}

// =====================================================
// Client-side Helper Functions
// =====================================================

/**
 * Hook for client-side CSRF token management
 * This should be used in a React component
 */
export const csrfTokenUtils = {
  /**
   * Gets the CSRF token from the cookie for client-side requests
   */
  getTokenFromCookie(): string | undefined {
    if (typeof document === 'undefined') return undefined;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === CSRF_TOKEN_COOKIE_NAME) {
        return value;
      }
    }
    return undefined;
  },

  /**
   * Adds CSRF token to fetch request headers
   */
  addTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
    const token = this.getTokenFromCookie();
    if (token) {
      return {
        ...headers,
        [CSRF_TOKEN_HEADER_NAME]: token,
      };
    }
    return headers;
  },

  /**
   * Creates a fetch wrapper with automatic CSRF token inclusion
   */
  createProtectedFetch() {
    return async (url: string, options: RequestInit = {}) => {
      const token = this.getTokenFromCookie();
      const headers = new Headers(options.headers);

      if (token) {
        headers.set(CSRF_TOKEN_HEADER_NAME, token);
      }

      return fetch(url, {
        ...options,
        headers,
      });
    };
  },
};

// =====================================================
// Server Action CSRF Protection
// =====================================================

/**
 * Validates CSRF token for Server Actions
 * Use this at the beginning of your Server Actions
 */
export async function validateServerActionCsrf(
  formData: FormData
): Promise<{ valid: boolean; error?: string }> {
  const token = formData.get('csrf_token') as string | null;

  if (!token) {
    return { valid: false, error: 'CSRF token missing' };
  }

  const isValid = await validateCsrfToken(token);

  if (!isValid) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
}

/**
 * Higher-order function to wrap Server Actions with CSRF protection
 */
export function withCsrfProtection<T extends any[], R>(
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    // Check if first argument is FormData
    if (args[0] instanceof FormData) {
      const validation = await validateServerActionCsrf(args[0]);
      if (!validation.valid) {
        throw new Error(validation.error || 'CSRF validation failed');
      }
    }

    return action(...args);
  };
}

// =====================================================
// API Route CSRF Protection
// =====================================================

/**
 * Validates CSRF token for API routes
 */
export async function validateApiCsrf(
  request: Request
): Promise<{ valid: boolean; error?: string }> {
  const token = request.headers.get(CSRF_TOKEN_HEADER_NAME);

  if (!token) {
    return { valid: false, error: 'CSRF token missing' };
  }

  const isValid = await validateCsrfToken(token);

  if (!isValid) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
}

/**
 * Middleware wrapper for API routes with CSRF protection
 */
export function withApiCsrfProtection<T>(
  handler: (request: Request) => Promise<T>
) {
  return async (request: Request): Promise<T | Response> => {
    // Only check for state-changing methods
    if (shouldProtectRequest(request.method, new URL(request.url).pathname)) {
      const validation = await validateApiCsrf(request);

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: validation.error || 'CSRF validation failed',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return handler(request);
  };
}

// Export constants for use in other files
export const CSRF_CONSTANTS = {
  TOKEN_COOKIE_NAME: CSRF_TOKEN_COOKIE_NAME,
  TOKEN_HEADER_NAME: CSRF_TOKEN_HEADER_NAME,
  TOKEN_LENGTH: CSRF_TOKEN_LENGTH,
  TOKEN_EXPIRY: CSRF_TOKEN_EXPIRY,
};
