// =====================================================
// Central Mock Exports
// =====================================================

export * from './supabase';
export * from './openai';
export * from './next';

// =====================================================
// Global Mock Setup
// =====================================================

import { setupNextMocks } from './next';
import { vi } from 'vitest';

/**
 * Sets up all global mocks for testing
 */
export function setupGlobalMocks() {
  // Setup Next.js mocks
  setupNextMocks();

  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  // Mock window.matchMedia (only if in browser environment)
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  // Mock IntersectionObserver
  if (typeof global.IntersectionObserver === 'undefined') {
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as any;
  }

  // Mock ResizeObserver
  if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as any;
  }

  // Mock localStorage (only if in browser environment)
  if (typeof window !== 'undefined') {
    const localStorageMock = (() => {
      let store: Record<string, string> = {};

      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
        get length() {
          return Object.keys(store).length;
        },
        key: vi.fn((index: number) => {
          const keys = Object.keys(store);
          return keys[index] || null;
        }),
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: localStorageMock,
      writable: true,
    });
  }

  // Mock fetch
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    headers: new Headers(),
  } as Response);
}

/**
 * Resets all global mocks
 */
export function resetGlobalMocks() {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    localStorage?.clear();
    sessionStorage?.clear();
  }
}
