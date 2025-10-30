import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  uuidSchema,
  urlSchema,
  phoneSchema,
  safeTextSchema,
  loginSchema,
  registerSchema,
  validateRequest,
} from '../validation';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct emails', async () => {
      const result = emailSchema.parse('test@example.com');
      expect(result).toBe('test@example.com');
    });

    it('should normalize emails to lowercase', async () => {
      const result = emailSchema.parse('Test@Example.COM');
      expect(result).toBe('test@example.com');
    });

    it('should trim whitespace', async () => {
      const result = emailSchema.parse('  test@example.com  ');
      expect(result).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
      expect(() => emailSchema.parse('test@')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong passwords', () => {
      expect(() => passwordSchema.parse('StrongPass123')).not.toThrow();
      expect(() => passwordSchema.parse('Abc123xyz')).not.toThrow();
    });

    it('should reject weak passwords', () => {
      expect(() => passwordSchema.parse('short')).toThrow(); // Too short
      expect(() => passwordSchema.parse('alllowercase123')).toThrow(); // No uppercase
      expect(() => passwordSchema.parse('ALLUPPERCASE123')).toThrow(); // No lowercase
      expect(() => passwordSchema.parse('NoNumbers')).toThrow(); // No numbers
    });

    it('should enforce length requirements', () => {
      expect(() => passwordSchema.parse('Pass1')).toThrow(); // Too short
      expect(() => passwordSchema.parse('a'.repeat(101))).toThrow(); // Too long
    });
  });

  describe('uuidSchema', () => {
    it('should validate UUIDs', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = uuidSchema.parse(validUuid);
      expect(result).toBe(validUuid);
    });

    it('should normalize UUIDs to lowercase', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      const result = uuidSchema.parse(uuid);
      expect(result).toBe(uuid.toLowerCase());
    });

    it('should reject invalid UUIDs', () => {
      expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
      expect(() => uuidSchema.parse('550e8400-e29b-41d4-a716')).toThrow();
    });
  });

  describe('urlSchema', () => {
    it('should validate URLs', () => {
      expect(() => urlSchema.parse('https://example.com')).not.toThrow();
      expect(() => urlSchema.parse('http://example.com/path')).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      expect(() => urlSchema.parse('not a url')).toThrow();
      expect(() => urlSchema.parse('ftp://example.com')).toThrow(); // Only HTTP/HTTPS
    });
  });

  describe('phoneSchema', () => {
    it('should validate phone numbers', () => {
      expect(() => phoneSchema.parse('+1 (555) 123-4567')).not.toThrow();
      expect(() => phoneSchema.parse('555-123-4567')).not.toThrow();
    });

    it('should reject invalid phone numbers', () => {
      expect(() => phoneSchema.parse('123')).toThrow(); // Too short
      expect(() => phoneSchema.parse('abc-def-ghij')).toThrow(); // Invalid characters
    });
  });

  describe('safeTextSchema', () => {
    it('should validate safe text', () => {
      const schema = safeTextSchema();
      expect(() => schema.parse('Hello World')).not.toThrow();
    });

    it('should trim whitespace', () => {
      const schema = safeTextSchema();
      const result = schema.parse('  Hello  ');
      expect(result).toBe('Hello');
    });

    it('should reject dangerous content', () => {
      const schema = safeTextSchema();
      expect(() => schema.parse('<script>alert(1)</script>')).toThrow();
      expect(() => schema.parse('javascript:alert(1)')).toThrow();
      expect(() => schema.parse('<iframe src="evil">')).toThrow();
    });

    it('should enforce length limits', () => {
      const schema = safeTextSchema({ minLength: 5, maxLength: 10 });
      expect(() => schema.parse('test')).toThrow(); // Too short
      expect(() => schema.parse('this is too long')).toThrow(); // Too long
      expect(() => schema.parse('perfect')).not.toThrow(); // Just right
    });
  });

  describe('loginSchema', () => {
    it('should validate login credentials', () => {
      const valid = {
        email: 'test@example.com',
        password: 'anypassword',
      };
      expect(() => loginSchema.parse(valid)).not.toThrow();
    });

    it('should reject invalid credentials', () => {
      expect(() =>
        loginSchema.parse({ email: 'invalid', password: 'pass' })
      ).toThrow();
      expect(() =>
        loginSchema.parse({ email: 'test@example.com', password: '' })
      ).toThrow();
    });
  });

  describe('registerSchema', () => {
    it('should validate registration data', () => {
      const valid = {
        email: 'test@example.com',
        password: 'StrongPass123',
        full_name: 'John Doe',
        company_name: 'Acme Corp',
        phone: '+1 555-123-4567',
      };
      expect(() => registerSchema.parse(valid)).not.toThrow();
    });

    it('should allow optional fields to be omitted', () => {
      const minimal = {
        email: 'test@example.com',
        password: 'StrongPass123',
      };
      expect(() => registerSchema.parse(minimal)).not.toThrow();
    });

    it('should reject weak passwords', () => {
      const weak = {
        email: 'test@example.com',
        password: 'weak',
      };
      expect(() => registerSchema.parse(weak)).toThrow();
    });
  });

  describe('validateRequest', () => {
    it('should validate valid data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = await validateRequest(
        { name: 'John', age: 30 },
        schema
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = await validateRequest(
        { name: 'John', age: 'not a number' },
        schema
      );

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle multiple validation errors', async () => {
      const schema = z.object({
        email: emailSchema,
        password: passwordSchema,
      });

      const result = await validateRequest(
        { email: 'invalid', password: 'weak' },
        schema
      );

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(1);
    });
  });
});
