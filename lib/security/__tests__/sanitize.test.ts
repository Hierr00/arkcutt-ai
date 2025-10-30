import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  stripHtml,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeFileName,
  sanitizeText,
  sanitizeNumber,
  sanitizeUuid,
  isValidEmail,
  isValidUrl,
  isValidUuid,
  isSafeString,
} from '../sanitize';

describe('Input Sanitization', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
      expect(escapeHtml("It's a test & more")).toBe(
        "It&#x27;s a test &amp; more"
      );
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe(
        'Hello World'
      );
      expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('should handle text without HTML', () => {
      expect(stripHtml('Plain text')).toBe('Plain text');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize email addresses', () => {
      expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
      expect(sanitizeEmail('user+tag@domain.com')).toBe('user+tag@domain.com');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeEmail('user<script>@domain.com')).toBe('userscript@domain.com');
    });
  });

  describe('sanitizePhone', () => {
    it('should keep only valid phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
      expect(sanitizePhone('555-CALL-NOW')).toBe('555--');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow safe URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
    });

    it('should block dangerous protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    });

    it('should handle protocol-relative URLs', () => {
      expect(sanitizeUrl('//example.com')).toBe('https://example.com');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('etcpasswd');
      expect(sanitizeFileName('file<>:"|?*.txt')).toBe('file.txt');
    });

    it('should remove leading dots', () => {
      expect(sanitizeFileName('...hidden.txt')).toBe('hidden.txt');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toMatch(/\.txt$/);
    });
  });

  describe('sanitizeText', () => {
    it('should trim and escape HTML by default', () => {
      const result = sanitizeText('  <script>alert("xss")</script>  ');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should respect maxLength option', () => {
      const result = sanitizeText('a'.repeat(100), { maxLength: 50 });
      expect(result.length).toBe(50);
    });

    it('should allow HTML when specified', () => {
      const result = sanitizeText('<p>Hello</p>', { allowHtml: true });
      expect(result).toBe('<p>Hello</p>');
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse and validate numbers', () => {
      expect(sanitizeNumber('123.45')).toBe(123.45);
      expect(sanitizeNumber(456)).toBe(456);
    });

    it('should apply min/max constraints', () => {
      expect(sanitizeNumber(5, { min: 10, max: 100 })).toBe(10);
      expect(sanitizeNumber(150, { min: 10, max: 100 })).toBe(100);
      expect(sanitizeNumber(50, { min: 10, max: 100 })).toBe(50);
    });

    it('should handle decimals', () => {
      expect(sanitizeNumber(123.456789, { decimals: 2 })).toBe(123.46);
    });

    it('should return null for invalid input', () => {
      expect(sanitizeNumber('not a number')).toBeNull();
      expect(sanitizeNumber(NaN)).toBeNull();
      expect(sanitizeNumber(Infinity)).toBeNull();
    });
  });

  describe('sanitizeUuid', () => {
    it('should validate and normalize UUIDs', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(sanitizeUuid(validUuid)).toBe(validUuid);
      expect(sanitizeUuid(validUuid.toUpperCase())).toBe(validUuid);
    });

    it('should return null for invalid UUIDs', () => {
      expect(sanitizeUuid('not-a-uuid')).toBeNull();
      expect(sanitizeUuid('550e8400-e29b-41d4-a716')).toBeNull();
    });
  });

  describe('Validation functions', () => {
    describe('isValidEmail', () => {
      it('should validate email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should validate URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://example.com/path?query=1')).toBe(true);
        expect(isValidUrl('ftp://example.com')).toBe(false);
        expect(isValidUrl('not a url')).toBe(false);
      });
    });

    describe('isValidUuid', () => {
      it('should validate UUIDs', () => {
        expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isValidUuid('not-a-uuid')).toBe(false);
      });
    });

    describe('isSafeString', () => {
      it('should detect dangerous patterns', () => {
        expect(isSafeString('Hello World')).toBe(true);
        expect(isSafeString('<script>alert(1)</script>')).toBe(false);
        expect(isSafeString('javascript:alert(1)')).toBe(false);
        expect(isSafeString('<iframe src="evil.com">')).toBe(false);
        expect(isSafeString('onclick="alert(1)"')).toBe(false);
      });
    });
  });
});
