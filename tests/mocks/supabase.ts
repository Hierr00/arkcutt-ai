import { vi } from 'vitest';

// =====================================================
// Mock Supabase Client
// =====================================================

export const createMockSupabaseClient = () => {
  const mockData = {
    users: [],
    quotations: [],
    rfqs: [],
    providers: [],
    audit_logs: [],
  };

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      then: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    })),
    rpc: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'mock-path' },
          error: null,
        }),
        download: vi.fn().mockResolvedValue({
          data: new Blob(),
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        list: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://mock-url.com' },
        }),
      })),
    },
  };
};

// =====================================================
// Mock User Data
// =====================================================

export const mockUser = {
  id: 'mock-user-id-123',
  email: 'test@example.com',
  role: 'admin' as const,
  full_name: 'Test User',
  company_name: 'Test Company',
  phone: '+1234567890',
  avatar_url: null,
  is_active: true,
  email_verified: true,
  last_login_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockOperatorUser = {
  ...mockUser,
  id: 'mock-operator-id',
  email: 'operator@example.com',
  role: 'operator' as const,
};

export const mockViewerUser = {
  ...mockUser,
  id: 'mock-viewer-id',
  email: 'viewer@example.com',
  role: 'viewer' as const,
};

// =====================================================
// Mock Session Data
// =====================================================

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: {
    id: mockUser.id,
    email: mockUser.email,
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

// =====================================================
// Mock RFQ Data
// =====================================================

export const mockRFQ = {
  id: 'mock-rfq-123',
  request_number: 'RFQ-2025-001',
  status: 'pending',
  created_by: mockUser.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  items: [
    {
      id: 'item-1',
      description: 'Test Item 1',
      quantity: 10,
      unit: 'pcs',
    },
  ],
  notes: 'Test RFQ notes',
};

// =====================================================
// Mock Quotation Data
// =====================================================

export const mockQuotation = {
  id: 'mock-quotation-123',
  quotation_number: 'QT-2025-001',
  rfq_id: mockRFQ.id,
  provider_id: 'mock-provider-123',
  status: 'pending',
  total_amount: 1000.0,
  currency: 'USD',
  created_by: mockUser.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  items: [
    {
      id: 'quote-item-1',
      rfq_item_id: 'item-1',
      unit_price: 100.0,
      quantity: 10,
      total: 1000.0,
    },
  ],
};

// =====================================================
// Mock Provider Data
// =====================================================

export const mockProvider = {
  id: 'mock-provider-123',
  name: 'Test Provider Inc.',
  email: 'contact@testprovider.com',
  phone: '+1234567890',
  address: '123 Test St, Test City, TC 12345',
  website: 'https://testprovider.com',
  rating: 4.5,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Creates a mock Supabase client with pre-configured data
 */
export function createMockSupabaseWithData(data: {
  users?: any[];
  quotations?: any[];
  quotation_requests?: any[];
  rfqs?: any[];
  external_quotations?: any[];
  providers?: any[];
  [key: string]: any[] | undefined;
}) {
  const client = createMockSupabaseClient();

  // Override the from().then() to return specific data
  client.from = vi.fn((table: string) => {
    const tableData = data[table as keyof typeof data] || [];

    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: tableData[0] || null,
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: tableData[0] || null,
        error: null,
      }),
      then: vi.fn().mockResolvedValue({
        data: tableData,
        error: null,
        count: tableData.length,
      }),
    };
  });

  return client;
}

/**
 * Creates a mock authenticated Supabase client
 */
export function createAuthenticatedMockClient(user = mockUser) {
  const client = createMockSupabaseClient();

  client.auth.getUser.mockResolvedValue({
    data: { user: { ...user, aud: 'authenticated', role: 'authenticated' } },
    error: null,
  });

  client.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });

  return client;
}

/**
 * Creates a mock error response
 */
export function createMockError(message: string, code?: string) {
  return {
    data: null,
    error: {
      message,
      code: code || 'MOCK_ERROR',
      details: null,
      hint: null,
    },
  };
}
