import { z } from 'zod';

// =====================================================
// Common Validation Schemas
// =====================================================

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/**
 * UUID validation schema
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .transform((val) => val.toLowerCase());

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTP or HTTPS protocol' }
  );

/**
 * Phone number validation schema
 */
export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 characters')
  .max(20, 'Phone number must be less than 20 characters')
  .regex(/^[0-9+\-() ]+$/, 'Phone number contains invalid characters');

/**
 * Safe text validation schema (no HTML)
 */
export const safeTextSchema = (options: {
  minLength?: number;
  maxLength?: number;
} = {}) => {
  const { minLength = 1, maxLength = 1000 } = options;

  return z
    .string()
    .min(minLength, `Text must be at least ${minLength} characters`)
    .max(maxLength, `Text must be less than ${maxLength} characters`)
    .refine((val) => !/<script|<iframe|javascript:|on\w+=/i.test(val), {
      message: 'Text contains potentially dangerous content',
    })
    .transform((val) => val.trim());
};

/**
 * Alphanumeric validation schema
 */
export const alphanumericSchema = z
  .string()
  .regex(/^[a-zA-Z0-9\s]+$/, 'Must contain only letters, numbers, and spaces')
  .transform((val) => val.trim());

/**
 * Numeric validation schema
 */
export const numericSchema = (options: {
  min?: number;
  max?: number;
  integer?: boolean;
} = {}) => {
  const { min, max, integer = false } = options;

  let schema = integer ? z.number().int('Must be an integer') : z.number();

  if (min !== undefined) {
    schema = schema.min(min, `Must be at least ${min}`);
  }

  if (max !== undefined) {
    schema = schema.max(max, `Must be at most ${max}`);
  }

  return schema;
};

/**
 * Date validation schema
 */
export const dateSchema = (options: {
  min?: Date;
  max?: Date;
} = {}) => {
  const { min, max } = options;

  let schema = z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Invalid date format',
  });

  if (min) {
    schema = schema.min(min, `Date must be after ${min.toISOString()}`);
  }

  if (max) {
    schema = schema.max(max, `Date must be before ${max.toISOString()}`);
  }

  return schema;
};

/**
 * File name validation schema
 */
export const fileNameSchema = z
  .string()
  .min(1, 'File name is required')
  .max(255, 'File name must be less than 255 characters')
  .regex(
    /^[a-zA-Z0-9._\- ]+$/,
    'File name contains invalid characters'
  )
  .refine((val) => !val.startsWith('.'), {
    message: 'File name cannot start with a dot',
  });

// =====================================================
// User Input Schemas
// =====================================================

/**
 * Login credentials schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Registration data schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: safeTextSchema({ minLength: 2, maxLength: 100 }).optional(),
  company_name: safeTextSchema({ minLength: 2, maxLength: 200 }).optional(),
  phone: phoneSchema.optional(),
});

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  full_name: safeTextSchema({ minLength: 2, maxLength: 100 }).optional(),
  company_name: safeTextSchema({ minLength: 2, maxLength: 200 }).optional(),
  phone: phoneSchema.optional(),
  avatar_url: urlSchema.optional(),
});

/**
 * Password reset schema
 */
export const passwordResetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: safeTextSchema({ minLength: 1, maxLength: 200 }),
  limit: numericSchema({ min: 1, max: 100, integer: true }).optional(),
  offset: numericSchema({ min: 0, integer: true }).optional(),
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: numericSchema({ min: 1, integer: true }).default(1),
  pageSize: numericSchema({ min: 1, max: 100, integer: true }).default(10),
});

// =====================================================
// API Request Validation Helper
// =====================================================

/**
 * Validates API request data against a schema
 */
export async function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Promise<{
  success: boolean;
  data?: T;
  errors?: string[];
}> {
  try {
    const validated = await schema.parseAsync(data);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      return {
        success: false,
        errors,
      };
    }

    return {
      success: false,
      errors: ['Validation failed'],
    };
  }
}

/**
 * Validates and sanitizes form data
 */
export function validateFormData<T>(
  formData: FormData,
  schema: z.ZodSchema<T>
): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const data: any = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const validated = schema.parse(data);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      for (const err of error.errors) {
        const path = err.path.join('.');
        errors[path] = err.message;
      }
      return {
        success: false,
        errors,
      };
    }

    return {
      success: false,
      errors: { _form: 'Validation failed' },
    };
  }
}

// =====================================================
// Type Exports
// =====================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
