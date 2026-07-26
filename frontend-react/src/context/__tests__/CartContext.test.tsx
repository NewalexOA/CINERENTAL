import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { CartProvider, useCart } from '../CartContext';
import type { Equipment } from '../../types/equipment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return createElement(CartProvider, null, children);
}

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 1,
    name: 'XLR cable',
    barcode: '00000000101',
    category_id: 5,
    status: 'AVAILABLE',
    replacement_cost: 1000,
    ...overrides,
  } as Equipment;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CartContext quantity handling', () => {
  it('defaults to quantity 1 when no amount is given', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(makeEquipment());
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.totalItems).toBe(1);
  });

  it('carries over the quantity supplied by the caller', () => {
    // Scan sessions hand over non-serialized items with quantity > 1.
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(makeEquipment({ id: 42 }), 3);
    });

    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
  });

  it('adds the supplied amount to an item already in the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(makeEquipment({ id: 42 }), 2);
    });
    act(() => {
      result.current.addItem(makeEquipment({ id: 42 }), 3);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('keeps separate entries per equipment id', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(makeEquipment({ id: 42 }), 3);
      result.current.addItem(makeEquipment({ id: 7, name: 'Alexa Mini' }), 1);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalItems).toBe(4);
  });

  it('falls back to 1 for non-positive or malformed amounts', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(makeEquipment({ id: 1 }), 0);
      result.current.addItem(makeEquipment({ id: 2 }), -5);
      result.current.addItem(makeEquipment({ id: 3 }), NaN);
    });

    expect(result.current.items.map((i) => i.quantity)).toEqual([1, 1, 1]);
  });
});
