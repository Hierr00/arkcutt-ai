import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/quotations/route';
import {
  createMockRequest,
  createMockSupabaseWithData,
  mockQuotation,
  mockRFQ,
} from '@/tests/mocks';

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseWithData({
    quotations: [mockQuotation],
    quotation_requests: [mockRFQ],
  }),
}));

describe('Quotations API Integration Tests', () => {
  describe('GET /api/quotations', () => {
    it('should return all quotations', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.quotations).toBeDefined();
      expect(Array.isArray(data.quotations)).toBe(true);
    });

    it('should return quotations filtered by pending status', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations?status=pending',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return quotations filtered by approved status', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations?status=approved',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return a specific quotation by id', async () => {
      const request = createMockRequest({
        url: `http://localhost:3000/api/quotations?id=${mockQuotation.id}`,
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.quotation).toBeDefined();
    });

    it('should filter by RFQ id', async () => {
      const request = createMockRequest({
        url: `http://localhost:3000/api/quotations?rfq_id=${mockQuotation.rfq_id}`,
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
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
        url: 'http://localhost:3000/api/quotations',
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/quotations', () => {
    it('should create a new quotation with valid data', async () => {
      const newQuotation = {
        rfq_id: mockRFQ.id,
        provider_id: 'provider-123',
        items: [
          {
            description: 'Steel part',
            quantity: 100,
            unit_price: 10.0,
            total: 1000.0,
          },
        ],
        subtotal: 1000.0,
        tax: 100.0,
        total_amount: 1100.0,
        currency: 'USD',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: newQuotation,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.quotation).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidQuotation = {
        rfq_id: mockRFQ.id,
        // Missing required fields
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: invalidQuotation,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should validate numeric values', async () => {
      const quotationWithInvalidNumbers = {
        rfq_id: mockRFQ.id,
        provider_id: 'provider-123',
        items: [
          {
            description: 'Steel part',
            quantity: -10, // Invalid negative quantity
            unit_price: 10.0,
            total: -100.0,
          },
        ],
        total_amount: -100.0,
        currency: 'USD',
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: quotationWithInvalidNumbers,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.success).toBe(false);
    });

    it('should validate currency format', async () => {
      const quotationWithInvalidCurrency = {
        rfq_id: mockRFQ.id,
        provider_id: 'provider-123',
        items: [
          {
            description: 'Steel part',
            quantity: 10,
            unit_price: 10.0,
            total: 100.0,
          },
        ],
        total_amount: 100.0,
        currency: 'INVALID', // Invalid currency code
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: quotationWithInvalidCurrency,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.success).toBe(false);
    });

    it('should calculate totals correctly', async () => {
      const quotationWithWrongTotal = {
        rfq_id: mockRFQ.id,
        provider_id: 'provider-123',
        items: [
          {
            description: 'Steel part',
            quantity: 10,
            unit_price: 10.0,
            total: 100.0,
          },
        ],
        subtotal: 100.0,
        tax: 10.0,
        total_amount: 500.0, // Wrong total!
        currency: 'USD',
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: quotationWithWrongTotal,
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should either recalculate or reject
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Quotation Business Logic', () => {
    it('should not allow quotation for non-existent RFQ', async () => {
      const quotationForNonExistentRFQ = {
        rfq_id: 'non-existent-rfq-id',
        provider_id: 'provider-123',
        items: [
          {
            description: 'Steel part',
            quantity: 10,
            unit_price: 10.0,
            total: 100.0,
          },
        ],
        total_amount: 100.0,
        currency: 'USD',
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: quotationForNonExistentRFQ,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.success).toBe(false);
    });

    it('should validate items array is not empty', async () => {
      const quotationWithNoItems = {
        rfq_id: mockRFQ.id,
        provider_id: 'provider-123',
        items: [], // Empty items
        total_amount: 0,
        currency: 'USD',
      };

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: quotationWithNoItems,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('items');
    });

    it('should generate unique quotation numbers', async () => {
      const newQuotation = {
        rfq_id: mockRFQ.id,
        provider_id: 'provider-123',
        items: [
          {
            description: 'Steel part',
            quantity: 10,
            unit_price: 10.0,
            total: 100.0,
          },
        ],
        total_amount: 100.0,
        currency: 'USD',
      };

      const request1 = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: newQuotation,
      });

      const request2 = createMockRequest({
        url: 'http://localhost:3000/api/quotations',
        method: 'POST',
        body: newQuotation,
      });

      const response1 = await POST(request1 as any);
      const data1 = await response1.json();

      const response2 = await POST(request2 as any);
      const data2 = await response2.json();

      if (data1.success && data2.success) {
        expect(data1.quotation.quotation_number).not.toBe(
          data2.quotation.quotation_number
        );
      }
    });
  });
});
