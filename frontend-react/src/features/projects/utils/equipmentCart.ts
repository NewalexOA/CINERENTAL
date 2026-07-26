import { Equipment } from '../../../types/equipment';

/**
 * Staging cart for adding equipment to an existing project.
 *
 * Mirrors the business rules of the legacy universal-cart PROJECT_VIEW config:
 * items are unique by equipment id, re-adding bumps the quantity, and both the
 * number of positions and the per-position quantity are capped.
 */

export const MAX_CART_ITEMS = 50;
export const MAX_QUANTITY_PER_ITEM = 10;

export interface CartEntry {
  equipment_id: number;
  name: string;
  barcode: string;
  serial_number?: string;
  category_name?: string;
  replacement_cost: number;
  quantity: number;
  /** When false, custom_start/custom_end are used instead of the project period. */
  use_project_dates: boolean;
  custom_start: string | null;
  custom_end: string | null;
}

export type AddToCartOutcome =
  | 'added'
  | 'incremented'
  | 'serialized_already_in_cart'
  | 'item_limit_reached'
  | 'quantity_limit_reached';

export interface AddToCartResult {
  entries: CartEntry[];
  outcome: AddToCartOutcome;
}

/** Serialized equipment is a single physical unit, so it never stacks. */
export function isSerialized(equipment: Pick<Equipment, 'serial_number'>): boolean {
  return Boolean(equipment.serial_number);
}

function toEntry(equipment: Equipment, quantity: number): CartEntry {
  return {
    equipment_id: equipment.id,
    name: equipment.name,
    barcode: equipment.barcode,
    serial_number: equipment.serial_number,
    category_name: equipment.category_name,
    replacement_cost: equipment.replacement_cost ?? 0,
    quantity,
    use_project_dates: true,
    custom_start: null,
    custom_end: null
  };
}

/**
 * Add equipment to the staging cart.
 *
 * Returns the next cart state together with an outcome the caller turns into
 * user feedback. The cart is never mutated in place.
 */
export function addToCart(
  entries: CartEntry[],
  equipment: Equipment,
  quantity = 1
): AddToCartResult {
  const amount = Math.max(1, Math.floor(quantity) || 1);
  const existing = entries.find((entry) => entry.equipment_id === equipment.id);

  if (existing) {
    // A serialized unit cannot be booked twice over the same period, so a
    // repeat scan is a no-op rather than a quantity bump.
    if (isSerialized(equipment)) {
      return { entries, outcome: 'serialized_already_in_cart' };
    }

    if (existing.quantity >= MAX_QUANTITY_PER_ITEM) {
      return { entries, outcome: 'quantity_limit_reached' };
    }

    const next = Math.min(existing.quantity + amount, MAX_QUANTITY_PER_ITEM);
    return {
      entries: entries.map((entry) =>
        entry.equipment_id === equipment.id ? { ...entry, quantity: next } : entry
      ),
      outcome: 'incremented'
    };
  }

  if (entries.length >= MAX_CART_ITEMS) {
    return { entries, outcome: 'item_limit_reached' };
  }

  const capped = isSerialized(equipment) ? 1 : Math.min(amount, MAX_QUANTITY_PER_ITEM);
  return { entries: [...entries, toEntry(equipment, capped)], outcome: 'added' };
}

export function removeFromCart(entries: CartEntry[], equipmentId: number): CartEntry[] {
  return entries.filter((entry) => entry.equipment_id !== equipmentId);
}

/** Set an explicit quantity; dropping to zero removes the position. */
export function setCartQuantity(
  entries: CartEntry[],
  equipmentId: number,
  quantity: number
): CartEntry[] {
  if (quantity <= 0) {
    return removeFromCart(entries, equipmentId);
  }

  return entries.map((entry) => {
    if (entry.equipment_id !== equipmentId) return entry;
    const ceiling = isSerialized(entry) ? 1 : MAX_QUANTITY_PER_ITEM;
    return { ...entry, quantity: Math.min(Math.floor(quantity), ceiling) };
  });
}

/** Switch a position between the project period and its own date range. */
export function setCartDates(
  entries: CartEntry[],
  equipmentId: number,
  dates: { useProjectDates: boolean; start?: string | null; end?: string | null }
): CartEntry[] {
  return entries.map((entry) => {
    if (entry.equipment_id !== equipmentId) return entry;
    if (dates.useProjectDates) {
      return { ...entry, use_project_dates: true, custom_start: null, custom_end: null };
    }
    return {
      ...entry,
      use_project_dates: false,
      custom_start: dates.start ?? entry.custom_start,
      custom_end: dates.end ?? entry.custom_end
    };
  });
}

export function cartTotalUnits(entries: CartEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.quantity, 0);
}

/**
 * Effective booking period for a position: its own range when set and complete,
 * the project period otherwise.
 */
export function resolveEntryDates(
  entry: CartEntry,
  projectStart: string,
  projectEnd: string
): { start: string; end: string } {
  if (!entry.use_project_dates && entry.custom_start && entry.custom_end) {
    return { start: entry.custom_start, end: entry.custom_end };
  }
  return { start: projectStart, end: projectEnd };
}
