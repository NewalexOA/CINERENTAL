/**
 * useUrlState
 *
 * Generic, typed hook wrapping useSearchParams (React Router v6) with
 * optional localStorage sync.
 *
 * Usage example:
 *
 *   const schema = {
 *     page:      { type: 'number', default: 1,    persist: false },
 *     size:      { type: 'number', default: 20 },
 *     search:    { type: 'string', default: '' },
 *     status:    { type: 'string', default: '' },
 *     clientId:  { type: 'number', default: null },
 *     clientName:{ type: 'string', default: null },
 *   } as const;
 *
 *   const { values, setParams } = useUrlState(schema, { storageKey: 'bookings-filters' });
 *
 *   // values.page      → number
 *   // values.clientId  → number | null
 *   // values.search    → string
 *
 *   setParams({ page: 2, search: 'lens' });  // batch update
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useSearchParams } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Type system
// ---------------------------------------------------------------------------

export type ParamDef = {
  readonly type: 'string' | 'number';
  readonly default: string | number | null;
  readonly persist?: boolean;
};

export type Schema = Readonly<Record<string, ParamDef>>;

/**
 * Infer the value type for a single param definition.
 *
 * The key trick: use `null extends D['default']` (NOT `D['default'] extends null`)
 * so that `{ default: null }` gives `T | null` and `{ default: 1 }` gives `T`.
 */
export type InferType<D extends ParamDef> = null extends D['default']
  ? D['type'] extends 'number'
    ? number | null
    : string | null
  : D['type'] extends 'number'
    ? number
    : string;

/** Map every key in the schema to its inferred value type. */
export type SchemaValues<S extends Schema> = {
  readonly [K in keyof S]: InferType<S[K]>;
};

/** Mutable partial used for setParams input (remove readonly so spread works). */
export type PartialValues<S extends Schema> = {
  -readonly [K in keyof S]?: InferType<S[K]>;
};

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export type UseUrlStateOptions = {
  /** localStorage key for persistence. When omitted, localStorage is not used. */
  storageKey?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a defaults map from the schema. */
function buildDefaults<S extends Schema>(schema: S): SchemaValues<S> {
  const result = {} as Record<string, string | number | null>;
  for (const key of Object.keys(schema)) {
    result[key] = schema[key].default;
  }
  return result as SchemaValues<S>;
}

/**
 * Parse a single raw string value from the URL according to a param definition.
 * Returns the schema default when the value is missing or invalid (NaN-safe).
 *
 * CRITICAL: check raw === null BEFORE Number() because Number(null) === 0.
 */
function parseValue<D extends ParamDef>(raw: string | null, def: D): InferType<D> {
  if (raw === null) {
    return def.default as InferType<D>;
  }
  if (def.type === 'number') {
    const n = Number(raw);
    if (Number.isNaN(n)) {
      return def.default as InferType<D>;
    }
    return n as InferType<D>;
  }
  return raw as InferType<D>;
}

/** Read all schema keys from a URLSearchParams instance. */
function parseFromUrl<S extends Schema>(
  searchParams: URLSearchParams,
  schema: S,
): SchemaValues<S> {
  const result = {} as Record<string, string | number | null>;
  for (const key of Object.keys(schema)) {
    result[key] = parseValue(searchParams.get(key), schema[key]);
  }
  return result as SchemaValues<S>;
}

/**
 * Read all schema keys from a plain object (localStorage-parsed JSON).
 * Validates each value's type; falls back to schema default on mismatch.
 */
function parseFromStored<S extends Schema>(
  stored: Record<string, unknown>,
  schema: S,
): SchemaValues<S> {
  const result = {} as Record<string, string | number | null>;
  for (const key of Object.keys(schema)) {
    const def = schema[key];
    const raw = stored[key];
    if (raw === undefined || raw === null) {
      result[key] = def.default;
    } else if (def.type === 'number') {
      const n = typeof raw === 'number' ? raw : Number(raw);
      result[key] = Number.isNaN(n) ? def.default : n;
    } else {
      result[key] = typeof raw === 'string' ? raw : def.default;
    }
  }
  return result as SchemaValues<S>;
}

/**
 * Convert values to URLSearchParams, omitting keys whose value equals
 * the schema default (keeps URLs clean).
 */
function toSearchParams<S extends Schema>(
  values: SchemaValues<S>,
  schema: S,
  defaults: SchemaValues<S>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(schema)) {
    const value = (values as Record<string, string | number | null>)[key];
    const def = (defaults as Record<string, string | number | null>)[key];
    if (value !== null && value !== def) {
      params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Safely read and JSON-parse a localStorage entry.
 * Removes the corrupted entry and returns null on any error.
 */
function safeReadStorage(storageKey: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    localStorage.removeItem(storageKey);
    return null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

/**
 * Write non-default, persistable values to localStorage.
 * Removes the entry when all values equal their defaults.
 */
function syncToStorage<S extends Schema>(
  storageKey: string,
  values: SchemaValues<S>,
  schema: S,
  defaults: SchemaValues<S>,
): void {
  const payload: Record<string, string | number> = {};
  for (const key of Object.keys(schema)) {
    const def = schema[key];
    if (def.persist === false) continue;
    const value = (values as Record<string, string | number | null>)[key];
    const defaultValue = (defaults as Record<string, string | number | null>)[key];
    if (value !== null && value !== defaultValue) {
      payload[key] = value;
    }
  }
  if (Object.keys(payload).length === 0) {
    localStorage.removeItem(storageKey);
  } else {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUrlState<S extends Schema>(
  schema: S,
  options: UseUrlStateOptions = {},
): {
  values: SchemaValues<S>;
  setParams: (updates: PartialValues<S>) => void;
} {
  const { storageKey } = options;

  // Stable schema ref — set once on first render, never mutated.
  const schemaRef = useRef<S>(schema);

  const [searchParams, setSearchParams] = useSearchParams();

  // Pre-compute defaults once (schema is constant at module level).
  const defaults = useMemo(() => buildDefaults(schemaRef.current), []);

  // Stable list of schema keys (derived from constant schema ref).
  const schemaKeysRef = useRef<string[]>(Object.keys(schemaRef.current));

  /**
   * Resolve values synchronously in useMemo so the first render already has
   * the correct values. TanStack Query will see these values immediately and
   * fire only ONE request.
   *
   * needsSync signals that the URL bar needs to be updated (localStorage
   * restore path) without causing a data re-fetch — handled in useLayoutEffect.
   */
  const resolved = useMemo<{ values: SchemaValues<S>; needsSync: boolean }>(() => {
    const hasUrlKeys = schemaKeysRef.current.some((key) => searchParams.has(key));

    if (hasUrlKeys) {
      return {
        values: parseFromUrl(searchParams, schemaRef.current),
        needsSync: false,
      };
    }

    if (storageKey) {
      const stored = safeReadStorage(storageKey);
      if (stored !== null) {
        return {
          values: parseFromStored(stored, schemaRef.current),
          needsSync: true,
        };
      }
    }

    return { values: defaults, needsSync: false };
    // searchParams is the only reactive dep; schemaRef/schemaKeysRef are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /**
   * Sync URL bar before paint when values were restored from localStorage.
   * This does NOT trigger a new render with different data — the values are
   * already correct from the useMemo above.
   */
  useLayoutEffect(() => {
    if (resolved.needsSync) {
      setSearchParams(
        toSearchParams(resolved.values, schemaRef.current, defaults),
        { replace: true },
      );
    }
    // Only re-run when needsSync changes (derived from searchParams change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.needsSync]);

  /**
   * Batch update params.
   *
   * - Starts from `new URLSearchParams(prev)` to preserve unknown params
   *   (UTM, etc.).
   * - Removes a schema key from the URL when its new value equals the default.
   * - Syncs to localStorage (if storageKey provided) after building new values.
   * - Uses `replace: true` by default to avoid history pollution.
   *
   * Wrapped in useCallback with stable deps so it can safely be used as a
   * dependency in debounce effects without causing infinite loops.
   */
  const setParams = useCallback(
    (updates: PartialValues<S>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const currentSchema = schemaRef.current;
          const currentDefaults = defaults;

          // Apply updates for schema keys only.
          for (const key of Object.keys(currentSchema)) {
            const typedKey = key as keyof S;
            if (!(typedKey in updates)) continue;

            const newValue = (updates as Record<string, string | number | null>)[key];
            const defaultValue = (currentDefaults as Record<string, string | number | null>)[key];

            if (newValue === null || newValue === defaultValue) {
              // Default value → omit from URL (clean URLs).
              next.delete(key);
            } else {
              next.set(key, String(newValue));
            }
          }

          // Sync to localStorage using the values reflected in `next`.
          if (storageKey) {
            const nextValues = parseFromUrl(next, currentSchema);
            syncToStorage(storageKey, nextValues, currentSchema, currentDefaults);
          }

          return next;
        },
        { replace: true },
      );
    },
    // setSearchParams is stable (React Router guarantee).
    // defaults is stable (derived from constant schema ref via useMemo).
    // storageKey treated as stable (caller responsibility).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSearchParams],
  );

  return { values: resolved.values, setParams };
}
