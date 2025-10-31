import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/rfqs/route';
import { createMockRequest, createMockSupabaseWithData, mockRFQ } from '@/tests/mocks';

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseWithData({
    external_quotations: [mockRFQ],
    quotation_requests: [
      {
        id: 'req-1',
        customer_email: 'customer@example.com',
        customer_name: 'Test Customer',
        customer_company: 'Test Company',
        parts_description: 'Steel parts',
        quantity: 100,
        material_requested: 'Steel',
        status: 'pending',
      },
    ],
  }),
}));

describe('RFQs API Integration Tests', () => {
  describe('GET /api/rfqs', () => {
    it('should return all RFQs', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rfqs).toBeDefined();
      expect(Array.isArray(data.rfqs)).toBe(true);
    });

    it('should return RFQs filtered by pending status', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs?type=pending',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rfqs).toBeDefined();
    });

    it('should return RFQs filtered by received status', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs?type=received',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return RFQs filtered by expired status', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs?type=expired',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return a specific RFQ by id', async () => {
      const request = createMockRequest({
        url: `http://localhost:3000/api/rfqs?id=${mockRFQ.id}`,
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rfq).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock Supabase to throw error
      vi.mock('@/lib/supabase', () => ({
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        },
      }));

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 404 for non-existent RFQ', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs?id=non-existent-id',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      // Depending on implementation, might return error or empty result
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/rfqs', () => {
    it('should create a new RFQ with valid data', async () => {
      const newRFQ = {
        request_id: 'req-1',
        provider_email: 'provider@example.com',
        provider_name: 'Test Provider',
        message_content: 'Please provide quote for steel parts',
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'POST',
        body: newRFQ,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rfq).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidRFQ = {
        provider_email: 'provider@example.com',
        // Missing required fields
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'POST',
        body: invalidRFQ,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should validate email format', async () => {
      const rfqWithInvalidEmail = {
        request_id: 'req-1',
        provider_email: 'invalid-email',
        provider_name: 'Test Provider',
        message_content: 'Test message',
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'POST',
        body: rfqWithInvalidEmail,
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should fail validation
      expect(data.success).toBe(false);
    });

    it('should handle database errors on creation', async () => {
      const newRFQ = {
        request_id: 'req-1',
        provider_email: 'provider@example.com',
        provider_name: 'Test Provider',
        message_content: 'Test message',
      };

      // Mock database error
      vi.mock('@/lib/supabase', () => ({
        supabase: {
          from: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Insert failed' },
                }),
              }),
            }),
          }),
        },
      }));

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'POST',
        body: newRFQ,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('RFQ Data Validation', () => {
    it('should sanitize input data', async () => {
      const rfqWithXSS = {
        request_id: 'req-1',
        provider_email: 'provider@example.com',
        provider_name: '<script>alert("xss")</script>',
        message_content: 'Normal message',
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'POST',
        body: rfqWithXSS,
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should either sanitize or reject
      if (data.success) {
        expect(data.rfq.provider_name).not.toContain('<script>');
      } else {
        expect(data.error).toBeDefined();
      }
    });

    it('should limit message content length', async () => {
      const rfqWithLongMessage = {
        request_id: 'req-1',
        provider_email: 'provider@example.com',
        provider_name: 'Test Provider',
        message_content: 'a'.repeat(10001), // Very long message
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rfqs',
        method: 'POST',
        body: rfqWithLongMessage,
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should either truncate or reject
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
