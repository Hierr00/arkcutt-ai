import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST } from '@/app/api/fin/classify-and-route/route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseAdmin = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

describe('POST /api/fin/classify-and-route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set environment variable for auth
    process.env.FIN_API_TOKEN = 'test-token-123';

    // Default mock: no results from DB
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
  });

  afterEach(() => {
    delete process.env.FIN_API_TOKEN;
  });

  describe('Authentication', () => {
    it('should reject request without auth header', async () => {
      const request = createRequest({
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
        thread_id: 'thread-123',
        has_attachments: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject request with invalid token', async () => {
      const request = createRequest(
        {
          from: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
          thread_id: 'thread-123',
          has_attachments: false,
        },
        'invalid-token'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept request with valid token', async () => {
      const request = createRequest(
        {
          from: 'test@example.com',
          subject: 'Presupuesto',
          body: 'Necesito presupuesto',
          thread_id: 'thread-123',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email format', async () => {
      const request = createRequest(
        {
          from: 'invalid-email',
          subject: 'Test',
          body: 'Test body',
          thread_id: 'thread-123',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should accept valid request structure', async () => {
      const request = createRequest(
        {
          from: 'customer@example.com',
          subject: 'Presupuesto piezas',
          body: 'Necesito 100 piezas en aluminio',
          thread_id: 'thread-123',
          has_attachments: true,
          attachments: [
            {
              filename: 'plano.pdf',
              content_type: 'application/pdf',
              size: 12345,
            },
          ],
        },
        'test-token-123'
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Routing Logic - Provider Detection', () => {
    it('should route to CLOSE_AND_PROCESS_EXTERNALLY when email is from known provider', async () => {
      // Mock provider lookup to return a provider
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'provider_contacts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'prov-123',
                company_name: 'Provider Inc',
                email: 'provider@example.com',
              },
              error: null,
            }),
          };
        }
        // routing_logs insert
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        };
      });

      const request = createRequest(
        {
          from: 'provider@example.com',
          subject: 'Re: RFQ-123 - Cotización',
          body: 'Nuestro precio es 15€/pieza',
          thread_id: 'thread-123',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('PROVIDER_RESPONSE');
      expect(data.action).toBe('CLOSE_AND_PROCESS_EXTERNALLY');
      expect(data.confidence).toBe(1.0);
      expect(data.automated_reply).toBeDefined();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.provider_id).toBe('prov-123');
    });
  });

  describe('Routing Logic - Spam Detection', () => {
    it('should route spam to IGNORE', async () => {
      const request = createRequest(
        {
          from: 'spam@viagra.xyz',
          subject: 'GANASTE! Click aquí',
          body: 'Oferta limitada 100% gratis',
          thread_id: 'thread-123',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('OUT_OF_SCOPE');
      expect(data.action).toBe('IGNORE');
      expect(data.reason).toBe('spam_detected');
      expect(data.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Routing Logic - Out of Scope', () => {
    it('should ignore HR-related emails', async () => {
      const request = createRequest(
        {
          from: 'hr@example.com',
          subject: 'Nómina Octubre',
          body: 'Adjunto nómina del mes',
          thread_id: 'thread-123',
          has_attachments: true,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('OUT_OF_SCOPE');
      expect(data.action).toBe('IGNORE');
      expect(data.reason).toContain('RRHH');
    });

    it('should ignore accounting emails', async () => {
      const request = createRequest(
        {
          from: 'accounting@example.com',
          subject: 'Factura #123',
          body: 'Adjunto factura para pago',
          thread_id: 'thread-123',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('OUT_OF_SCOPE');
      expect(data.action).toBe('IGNORE');
      expect(data.reason).toContain('Contabilidad');
    });
  });

  describe('Routing Logic - Existing Customer', () => {
    it('should route existing customer to CONTINUE_WITH_FIN with context', async () => {
      // Mock existing quotation lookup
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'quotation_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'quot-123',
                customer_email: 'customer@example.com',
                conversation_thread_id: 'thread-123',
                created_at: new Date().toISOString(),
                status: 'pending',
              },
              error: null,
            }),
          };
        }
        if (table === 'routing_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const request = createRequest(
        {
          from: 'customer@example.com',
          subject: 'Re: Presupuesto',
          body: 'Gracias, tengo una consulta adicional',
          thread_id: 'thread-123',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('CUSTOMER_FOLLOWUP');
      expect(data.action).toBe('CONTINUE_WITH_FIN');
      expect(data.confidence).toBe(1.0);
      expect(data.context).toBeDefined();
      expect(data.context.existing_customer).toBe(true);
      expect(data.context.previous_quotation_id).toBe('quot-123');
    });
  });

  describe('Routing Logic - New Quotation Request', () => {
    it('should route email with technical attachments to CONTINUE_WITH_FIN', async () => {
      const request = createRequest(
        {
          from: 'newcustomer@example.com',
          subject: 'Consulta mecanizado',
          body: 'Buenos días, necesito información',
          thread_id: 'thread-456',
          has_attachments: true,
          attachments: [
            {
              filename: 'plano_tecnico.pdf',
              content_type: 'application/pdf',
            },
          ],
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('CUSTOMER_INQUIRY');
      expect(data.action).toBe('CONTINUE_WITH_FIN');
      expect(data.reason).toContain('technical_attachments');
      expect(data.context.has_technical_attachments).toBe(true);
    });

    it('should route email with quotation keywords to CONTINUE_WITH_FIN', async () => {
      const request = createRequest(
        {
          from: 'newcustomer@example.com',
          subject: 'Solicitud de presupuesto',
          body: 'Necesito cotización para 50 piezas en aluminio 6061',
          thread_id: 'thread-789',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('CUSTOMER_INQUIRY');
      expect(data.action).toBe('CONTINUE_WITH_FIN');
      expect(data.reason).toContain('quotation_keywords');
      expect(data.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('Routing Logic - Uncertain Cases', () => {
    it('should escalate to human when intent is unclear', async () => {
      const request = createRequest(
        {
          from: 'someone@example.com',
          subject: 'Hola',
          body: 'Buenos días',
          thread_id: 'thread-999',
          has_attachments: false,
        },
        'test-token-123'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_decision).toBe('UNCERTAIN');
      expect(data.action).toBe('ESCALATE_TO_HUMAN');
      expect(data.escalation_message).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should respond in under 2 seconds', async () => {
      const start = Date.now();

      const request = createRequest(
        {
          from: 'test@example.com',
          subject: 'Presupuesto',
          body: 'Necesito presupuesto',
          thread_id: 'thread-perf',
          has_attachments: false,
        },
        'test-token-123'
      );

      await POST(request);

      const duration = Date.now() - start;

      // Should be very fast (< 2000ms even with DB queries)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Logging', () => {
    it('should log routing decision to database', async () => {
      const insertMock = vi.fn().mockResolvedValue({ data: {}, error: null });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'routing_logs') {
          return {
            insert: insertMock,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const request = createRequest(
        {
          from: 'test@example.com',
          subject: 'Presupuesto',
          body: 'Test',
          thread_id: 'thread-log',
          has_attachments: false,
        },
        'test-token-123'
      );

      await POST(request);

      // Wait a bit for async logging
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(insertMock).toHaveBeenCalled();
      const logEntry = insertMock.mock.calls[0][0];

      expect(logEntry.email_from).toBe('test@example.com');
      expect(logEntry.thread_id).toBe('thread-log');
      expect(logEntry.routing_decision).toBeDefined();
      expect(logEntry.action).toBeDefined();
      expect(logEntry.response_time_ms).toBeGreaterThan(0);
    });
  });
});

// Helper function to create mock request
function createRequest(body: any, authToken?: string): NextRequest {
  const headers = new Headers();
  headers.set('content-type', 'application/json');

  if (authToken) {
    headers.set('authorization', `Bearer ${authToken}`);
  }

  return new NextRequest('http://localhost:3000/api/fin/classify-and-route', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
