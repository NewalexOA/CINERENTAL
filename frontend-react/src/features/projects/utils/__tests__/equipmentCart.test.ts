import { describe, it, expect } from 'vitest';
import { Equipment } from '../../../../types/equipment';
import {
  CartEntry,
  MAX_CART_ITEMS,
  MAX_QUANTITY_PER_ITEM,
  addToCart,
  cartTotalUnits,
  removeFromCart,
  resolveEntryDates,
  setCartDates,
  setCartQuantity
} from '../equipmentCart';

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 1,
    name: 'XLR cable',
    barcode: '00000000101',
    category_id: 5,
    status: 'AVAILABLE',
    replacement_cost: 1000,
    ...overrides
  } as Equipment;
}

const CAMERA = makeEquipment({ id: 7, name: 'Alexa Mini', serial_number: 'SN-123' });

describe('addToCart', () => {
  it('adds a new position with quantity 1', () => {
    const { entries, outcome } = addToCart([], makeEquipment());

    expect(outcome).toBe('added');
    expect(entries).toHaveLength(1);
    expect(entries[0].quantity).toBe(1);
    expect(entries[0].use_project_dates).toBe(true);
  });

  it('increments quantity for non-serialized equipment', () => {
    const first = addToCart([], makeEquipment()).entries;
    const { entries, outcome } = addToCart(first, makeEquipment());

    expect(outcome).toBe('incremented');
    expect(entries).toHaveLength(1);
    expect(entries[0].quantity).toBe(2);
  });

  it('refuses to stack serialized equipment', () => {
    const first = addToCart([], CAMERA).entries;
    const { entries, outcome } = addToCart(first, CAMERA);

    expect(outcome).toBe('serialized_already_in_cart');
    expect(entries[0].quantity).toBe(1);
  });

  it('does not mutate the input array', () => {
    const original: CartEntry[] = [];
    addToCart(original, makeEquipment());

    expect(original).toHaveLength(0);
  });

  it('caps quantity at the per-item limit', () => {
    let entries = addToCart([], makeEquipment()).entries;
    for (let i = 1; i < MAX_QUANTITY_PER_ITEM; i++) {
      entries = addToCart(entries, makeEquipment()).entries;
    }
    expect(entries[0].quantity).toBe(MAX_QUANTITY_PER_ITEM);

    const { entries: capped, outcome } = addToCart(entries, makeEquipment());
    expect(outcome).toBe('quantity_limit_reached');
    expect(capped[0].quantity).toBe(MAX_QUANTITY_PER_ITEM);
  });

  it('caps the number of positions', () => {
    let entries: CartEntry[] = [];
    for (let i = 0; i < MAX_CART_ITEMS; i++) {
      entries = addToCart(entries, makeEquipment({ id: i + 100 })).entries;
    }
    expect(entries).toHaveLength(MAX_CART_ITEMS);

    const { entries: capped, outcome } = addToCart(entries, makeEquipment({ id: 9999 }));
    expect(outcome).toBe('item_limit_reached');
    expect(capped).toHaveLength(MAX_CART_ITEMS);
  });
});

describe('cart mutations', () => {
  it('removes a position', () => {
    const entries = addToCart([], makeEquipment()).entries;
    expect(removeFromCart(entries, 1)).toHaveLength(0);
  });

  it('removes the position when quantity drops to zero', () => {
    const entries = addToCart([], makeEquipment()).entries;
    expect(setCartQuantity(entries, 1, 0)).toHaveLength(0);
  });

  it('keeps serialized quantity at 1 even when set higher', () => {
    const entries = addToCart([], CAMERA).entries;
    expect(setCartQuantity(entries, 7, 5)[0].quantity).toBe(1);
  });

  it('sums units across positions', () => {
    let entries = addToCart([], makeEquipment()).entries;
    entries = addToCart(entries, makeEquipment()).entries;
    entries = addToCart(entries, CAMERA).entries;

    expect(cartTotalUnits(entries)).toBe(3);
  });
});

describe('per-item dates', () => {
  it('switches a position to its own period', () => {
    const entries = addToCart([], makeEquipment()).entries;
    const updated = setCartDates(entries, 1, {
      useProjectDates: false,
      start: '2026-08-01T00:00:00Z',
      end: '2026-08-05T00:00:00Z'
    });

    expect(updated[0].use_project_dates).toBe(false);
    expect(resolveEntryDates(updated[0], 'P-START', 'P-END')).toEqual({
      start: '2026-08-01T00:00:00Z',
      end: '2026-08-05T00:00:00Z'
    });
  });

  it('clears the custom period when switching back to project dates', () => {
    const entries = setCartDates(addToCart([], makeEquipment()).entries, 1, {
      useProjectDates: false,
      start: '2026-08-01T00:00:00Z',
      end: '2026-08-05T00:00:00Z'
    });
    const back = setCartDates(entries, 1, { useProjectDates: true });

    expect(back[0].custom_start).toBeNull();
    expect(resolveEntryDates(back[0], 'P-START', 'P-END')).toEqual({
      start: 'P-START',
      end: 'P-END'
    });
  });

  it('falls back to project dates when a custom period is incomplete', () => {
    const entries = setCartDates(addToCart([], makeEquipment()).entries, 1, {
      useProjectDates: false,
      start: '2026-08-01T00:00:00Z',
      end: null
    });

    expect(resolveEntryDates(entries[0], 'P-START', 'P-END')).toEqual({
      start: 'P-START',
      end: 'P-END'
    });
  });
});
