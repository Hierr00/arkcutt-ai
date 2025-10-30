import { vi } from 'vitest';

// =====================================================
// Mock Next.js Navigation
// =====================================================

export const createMockRouter = () => {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    basePath: '',
    locale: 'en',
    locales: ['en'],
    defaultLocale: 'en',
    isReady: true,
    isPreview: false,
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };
};

export const mockRouter = createMockRouter();

// Mock useRouter hook
export const mockUseRouter = () => mockRouter;

// Mock usePathname hook
export const mockUsePathname = vi.fn(() => '/');

// Mock useSearchParams hook
export const mockUseSearchParams = vi.fn(() => new URLSearchParams());

// =====================================================
// Mock Next.js Headers
// =====================================================

export const createMockHeaders = (headers: Record<string, string> = {}) => {
  const defaultHeaders: Record<string, string> = {
    'user-agent': 'Mozilla/5.0 (Test Browser)',
    'x-forwarded-for': '127.0.0.1',
    ...headers,
  };

  return {
    get: vi.fn((key: string) => defaultHeaders[key.toLowerCase()] || null),
    has: vi.fn((key: string) => key.toLowerCase() in defaultHeaders),
    entries: vi.fn(() => Object.entries(defaultHeaders)),
    forEach: vi.fn((callback: (value: string, key: string) => void) => {
      Object.entries(defaultHeaders).forEach(([key, value]) => callback(value, key));
    }),
  };
};

// =====================================================
// Mock Next.js Cookies
// =====================================================

export const createMockCookies = (cookies: Record<string, string> = {}) => {
  const cookieStore: Record<string, { value: string; options?: any }> = {};

  // Initialize with provided cookies
  Object.entries(cookies).forEach(([name, value]) => {
    cookieStore[name] = { value };
  });

  return {
    get: vi.fn((name: string) => {
      const cookie = cookieStore[name];
      return cookie ? { name, value: cookie.value } : undefined;
    }),
    getAll: vi.fn(() => {
      return Object.entries(cookieStore).map(([name, { value }]) => ({
        name,
        value,
      }));
    }),
    has: vi.fn((name: string) => name in cookieStore),
    set: vi.fn((name: string, value: string, options?: any) => {
      cookieStore[name] = { value, options };
    }),
    delete: vi.fn((name: string) => {
      delete cookieStore[name];
    }),
  };
};

// =====================================================
// Mock Next.js Request
// =====================================================

export const createMockRequest = (options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  cookies?: Record<string, string>;
} = {}) => {
  const {
    url = 'http://localhost:3000/',
    method = 'GET',
    headers = {},
    body,
    cookies = {},
  } = options;

  const mockHeaders = createMockHeaders(headers);
  const mockCookies = createMockCookies(cookies);

  return {
    url,
    method,
    headers: mockHeaders,
    cookies: mockCookies,
    body: body ? JSON.stringify(body) : null,
    json: vi.fn().mockResolvedValue(body || {}),
    text: vi.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
    formData: vi.fn().mockResolvedValue(new FormData()),
    clone: vi.fn(),
    ip: '127.0.0.1',
    geo: {
      city: 'Test City',
      country: 'US',
      region: 'CA',
    },
    nextUrl: new URL(url),
  };
};

// =====================================================
// Mock Next.js Response
// =====================================================

export const createMockResponse = (options: {
  status?: number;
  headers?: Record<string, string>;
  body?: any;
} = {}) => {
  const { status = 200, headers = {}, body } = options;

  return {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: createMockHeaders(headers),
    body: body ? JSON.stringify(body) : null,
    json: vi.fn().mockResolvedValue(body || {}),
    text: vi.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
    clone: vi.fn(),
    ok: status >= 200 && status < 300,
    redirected: false,
    type: 'basic' as ResponseType,
    url: 'http://localhost:3000/',
  };
};

// =====================================================
// Mock Next.js Redirect
// =====================================================

export const mockRedirect = vi.fn((url: string, type?: 'replace' | 'push') => {
  throw new Error(`NEXT_REDIRECT: ${url}`);
});

// =====================================================
// Mock Next.js NotFound
// =====================================================

export const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

// =====================================================
// Mock Next.js Image
// =====================================================

export const MockImage = vi.fn((props) => props);

// =====================================================
// Mock Next.js Link
// =====================================================

export const MockLink = vi.fn((props) => props);

// =====================================================
// Helper Functions
// =====================================================

/**
 * Sets up mocks for Next.js modules
 */
export function setupNextMocks() {
  vi.mock('next/navigation', () => ({
    useRouter: mockUseRouter,
    usePathname: mockUsePathname,
    useSearchParams: mockUseSearchParams,
    redirect: mockRedirect,
    notFound: mockNotFound,
  }));

  vi.mock('next/headers', async () => ({
    headers: () => createMockHeaders(),
    cookies: () => createMockCookies(),
  }));

  vi.mock('next/image', () => ({
    default: MockImage,
  }));

  vi.mock('next/link', () => ({
    default: MockLink,
  }));
}

/**
 * Resets all Next.js mocks
 */
export function resetNextMocks() {
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.refresh.mockClear();
  mockRouter.back.mockClear();
  mockRouter.forward.mockClear();
  mockRouter.prefetch.mockClear();
  mockUsePathname.mockClear();
  mockUseSearchParams.mockClear();
  mockRedirect.mockClear();
  mockNotFound.mockClear();
}
