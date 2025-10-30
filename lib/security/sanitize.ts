// =====================================================
// Input Sanitization Library
// =====================================================

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Removes all HTML tags from text
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  // Remove whitespace
  let sanitized = email.trim().toLowerCase();

  // Remove any characters that aren't valid in email addresses
  sanitized = sanitized.replace(/[^a-z0-9@._+-]/g, '');

  return sanitized;
}

/**
 * Sanitizes phone numbers (keeps only digits, +, -, (, ), spaces)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+\-() ]/g, '');
}

/**
 * Sanitizes URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }

  // Only allow http, https, mailto, tel
  const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:'];
  const hasProtocol = allowedProtocols.some((protocol) =>
    trimmed.startsWith(protocol)
  );

  if (!hasProtocol && trimmed.startsWith('//')) {
    return `https:${url.trim()}`;
  }

  return url.trim();
}

/**
 * Sanitizes file names to prevent path traversal
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and other dangerous characters
  let sanitized = fileName.replace(/[\/\\:*?"<>|]/g, '');

  // Remove leading dots to prevent hidden files
  sanitized = sanitized.replace(/^\.+/, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 255 - (ext ? ext.length + 1 : 0));
    sanitized = ext ? `${name}.${ext}` : name;
  }

  return sanitized;
}

/**
 * Sanitizes alphanumeric input (letters, numbers, spaces only)
 */
export function sanitizeAlphanumeric(text: string): string {
  return text.replace(/[^a-zA-Z0-9\s]/g, '');
}

/**
 * Sanitizes text input with common rules
 */
export function sanitizeText(
  text: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    trim?: boolean;
  } = {}
): string {
  const { maxLength = 10000, allowHtml = false, trim = true } = options;

  let sanitized = text;

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Remove HTML if not allowed
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes SQL input to prevent SQL injection
 * Note: This is a basic sanitization. Always use parameterized queries!
 */
export function sanitizeSql(text: string): string {
  // Escape single quotes
  let sanitized = text.replace(/'/g, "''");

  // Remove semicolons (to prevent multiple statements)
  sanitized = sanitized.replace(/;/g, '');

  // Remove SQL comment markers
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');

  return sanitized;
}

/**
 * Validates and sanitizes numeric input
 */
export function sanitizeNumber(
  value: string | number,
  options: {
    min?: number;
    max?: number;
    decimals?: number;
  } = {}
): number | null {
  const { min, max, decimals } = options;

  // Convert to number
  let num = typeof value === 'string' ? parseFloat(value) : value;

  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  // Apply min/max constraints
  if (min !== undefined && num < min) {
    num = min;
  }
  if (max !== undefined && num > max) {
    num = max;
  }

  // Round to specified decimals
  if (decimals !== undefined) {
    num = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  return num;
}

/**
 * Sanitizes JSON input
 */
export function sanitizeJson(json: string): object | null {
  try {
    const parsed = JSON.parse(json);

    // Recursively sanitize strings in the object
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return escapeHtml(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj !== null && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }

      return obj;
    };

    return sanitizeObject(parsed);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

/**
 * Sanitizes object for database insertion
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    allowedKeys?: string[];
    maxDepth?: number;
  } = {}
): Partial<T> {
  const { allowedKeys, maxDepth = 10 } = options;

  const sanitize = (value: any, depth: number = 0): any => {
    // Prevent deep nesting
    if (depth > maxDepth) {
      return undefined;
    }

    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle strings
    if (typeof value === 'string') {
      return sanitizeText(value);
    }

    // Handle numbers
    if (typeof value === 'number') {
      return sanitizeNumber(value);
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item, depth + 1));
    }

    // Handle objects
    if (typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitize(val, depth + 1);
      }
      return sanitized;
    }

    return undefined;
  };

  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if key is allowed
    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }

    result[key as keyof T] = sanitize(value);
  }

  return result;
}

/**
 * Validates and sanitizes UUID
 */
export function sanitizeUuid(uuid: string): string | null {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(uuid)) {
    return uuid.toLowerCase();
  }

  return null;
}

/**
 * Validates and sanitizes date strings
 */
export function sanitizeDate(dateString: string): Date | null {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return null;
  }

  // Check if date is within reasonable range (year 1900-2100)
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return null;
  }

  return date;
}

// =====================================================
// Validation Functions
// =====================================================

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Checks if string contains only safe characters
 */
export function isSafeString(str: string): boolean {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // Event handlers like onclick=
    /<iframe/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(str));
}
