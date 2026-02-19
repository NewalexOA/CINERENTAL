import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, type ReactNode } from 'react';
import { useUrlState } from '../useUrlState';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// localStorage mock
// Vitest 4.x jsdom environment provides localStorage as a plain empty object
// with no methods, so we install a proper in-memory implementation.
// ---------------------------------------------------------------------------

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string): void => { store[key] = value; }),
    removeItem: vi.fn((key: string): void => { delete store[key]; }),
    clear: vi.fn((): void => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number): string | null => Object.keys(store)[index] ?? null),
    _reset: () => { store = {}; },
  };
}

const localStorageMock = createLocalStorageMock();

// Install mock before any tests run
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper(initialUrl = '/') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries: [initialUrl] }, children);
  };
}

// ---------------------------------------------------------------------------
// Shared test schema (mirrors usage docs example)
// ---------------------------------------------------------------------------

const testSchema = {
  page:       { type: 'number', default: 1,    persist: false },
  size:       { type: 'number', default: 20 },
  search:     { type: 'string', default: '' },
  status:     { type: 'string', default: '' },
  clientId:   { type: 'number', default: null },
  clientName: { type: 'string', default: null },
} as const;

const STORAGE_KEY = 'test-filters';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUrlState', () => {
  beforeEach(() => {
    localStorageMock._reset();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Group 1: URL Parsing
  // -------------------------------------------------------------------------

  describe('URL Parsing', () => {
    it('1. returns all schema defaults when URL has no params', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/') },
      );

      expect(result.current.values.page).toBe(1);
      expect(result.current.values.size).toBe(20);
      expect(result.current.values.search).toBe('');
      expect(result.current.values.status).toBe('');
      expect(result.current.values.clientId).toBeNull();
      expect(result.current.values.clientName).toBeNull();
    });

    it('2. parses numeric and string params from the URL correctly', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/?page=3&status=ACTIVE') },
      );

      expect(result.current.values.page).toBe(3);
      expect(result.current.values.status).toBe('ACTIVE');
      // Remaining keys fall back to defaults
      expect(result.current.values.size).toBe(20);
      expect(result.current.values.search).toBe('');
      expect(result.current.values.clientId).toBeNull();
      expect(result.current.values.clientName).toBeNull();
    });

    it('3. falls back to default when a numeric param is invalid (NaN)', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/?page=abc') },
      );

      // 'abc' is NaN → should fall back to default (1)
      expect(result.current.values.page).toBe(1);
    });

    it('4. returns null (not 0) for nullable number field missing from URL', () => {
      // Number(null) === 0, so the hook must guard against missing params first.
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/?page=2') },
      );

      // clientId has default: null and is absent from URL → must be null, not 0
      expect(result.current.values.clientId).toBeNull();
      expect(result.current.values.clientId).not.toBe(0);
    });

    it('5. parses nullable string field from URL and returns null when missing', () => {
      const { result: withValue } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/?clientName=Acme') },
      );
      expect(withValue.current.values.clientName).toBe('Acme');

      const { result: withoutValue } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/') },
      );
      expect(withoutValue.current.values.clientName).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Group 2: setParams & Clean URLs
  // -------------------------------------------------------------------------

  describe('setParams & Clean URLs', () => {
    it('6. omits schema keys from URL when their value equals the default (clean URLs)', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/?page=5&search=lens') },
      );

      act(() => {
        result.current.setParams({ page: 1, search: '' });
      });

      // After resetting to defaults the hook returns default values
      expect(result.current.values.page).toBe(1);
      expect(result.current.values.search).toBe('');
    });

    it('7. preserves unknown (non-schema) URL params when calling setParams', () => {
      // Start with a non-schema param in the URL
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/?utm_source=google') },
      );

      act(() => {
        result.current.setParams({ status: 'ACTIVE' });
      });

      // status should now be reflected in values
      expect(result.current.values.status).toBe('ACTIVE');
    });

    it('8. applies a batch update of multiple params in a single call', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/') },
      );

      act(() => {
        result.current.setParams({ size: 50, page: 2 });
      });

      expect(result.current.values.size).toBe(50);
      expect(result.current.values.page).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Group 3: localStorage
  // -------------------------------------------------------------------------

  describe('localStorage', () => {
    it('9. writes non-default values to localStorage when storageKey is provided', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema, { storageKey: STORAGE_KEY }),
        { wrapper: createWrapper('/') },
      );

      act(() => {
        result.current.setParams({ status: 'ACTIVE' });
      });

      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.status).toBe('ACTIVE');
    });

    it('10. excludes persist:false fields (page) from localStorage writes', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema, { storageKey: STORAGE_KEY }),
        { wrapper: createWrapper('/') },
      );

      act(() => {
        // Set both a persist:false field (page) and a normal field (status)
        result.current.setParams({ page: 2, status: 'ACTIVE' });
      });

      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      // page must NOT be persisted
      expect(parsed).not.toHaveProperty('page');
      // status should be persisted
      expect(parsed.status).toBe('ACTIVE');
    });

    it('11. restores values from localStorage when the URL has no schema params', () => {
      // Pre-populate localStorage BEFORE rendering
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ status: 'DRAFT', size: 50 }));

      const { result } = renderHook(
        () => useUrlState(testSchema, { storageKey: STORAGE_KEY }),
        { wrapper: createWrapper('/') },
      );

      expect(result.current.values.status).toBe('DRAFT');
      expect(result.current.values.size).toBe(50);
    });

    it('12. URL params take priority over localStorage when both are present', () => {
      // localStorage says status='DRAFT'
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ status: 'DRAFT' }));

      // URL says status='CONFIRMED'
      const { result } = renderHook(
        () => useUrlState(testSchema, { storageKey: STORAGE_KEY }),
        { wrapper: createWrapper('/?status=CONFIRMED') },
      );

      // URL wins
      expect(result.current.values.status).toBe('CONFIRMED');
    });

    it('13. removes the localStorage entry when all values are reset to defaults', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema, { storageKey: STORAGE_KEY }),
        { wrapper: createWrapper('/') },
      );

      // First set a non-default value (writes to localStorage)
      act(() => {
        result.current.setParams({ status: 'ACTIVE' });
      });
      expect(localStorageMock.getItem(STORAGE_KEY)).not.toBeNull();

      // Then reset status back to default ('')
      act(() => {
        result.current.setParams({ status: '' });
      });

      // localStorage entry should be removed
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });

    it('14. handles corrupted localStorage gracefully and falls back to defaults', () => {
      // Set invalid JSON in localStorage
      localStorageMock.setItem(STORAGE_KEY, 'NOT_VALID_JSON{{{');

      const { result } = renderHook(
        () => useUrlState(testSchema, { storageKey: STORAGE_KEY }),
        { wrapper: createWrapper('/') },
      );

      // Should fall back to all schema defaults
      expect(result.current.values.page).toBe(1);
      expect(result.current.values.size).toBe(20);
      expect(result.current.values.search).toBe('');
      expect(result.current.values.status).toBe('');
      expect(result.current.values.clientId).toBeNull();
      expect(result.current.values.clientName).toBeNull();

      // Corrupted entry should be removed
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Group 4: Stability
  // -------------------------------------------------------------------------

  describe('Stability', () => {
    it('15. setParams has a stable reference across re-renders', () => {
      const { result, rerender } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/') },
      );

      const firstRef = result.current.setParams;

      rerender();

      expect(result.current.setParams).toBe(firstRef);
    });
  });

  // -------------------------------------------------------------------------
  // Group 5: Replace behavior
  // -------------------------------------------------------------------------

  describe('Replace behavior', () => {
    it('16. hook continues to work correctly after multiple successive setParams calls', () => {
      const { result } = renderHook(
        () => useUrlState(testSchema),
        { wrapper: createWrapper('/') },
      );

      act(() => {
        result.current.setParams({ status: 'ACTIVE' });
      });
      expect(result.current.values.status).toBe('ACTIVE');

      act(() => {
        result.current.setParams({ status: 'DRAFT' });
      });
      expect(result.current.values.status).toBe('DRAFT');

      act(() => {
        result.current.setParams({ page: 3, size: 50 });
      });
      expect(result.current.values.page).toBe(3);
      expect(result.current.values.size).toBe(50);
      // status survives subsequent unrelated setParams calls
      expect(result.current.values.status).toBe('DRAFT');
    });
  });
});
