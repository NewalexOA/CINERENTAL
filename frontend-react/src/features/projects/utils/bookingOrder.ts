import { Booking } from '../../../services/bookings';

/**
 * Ordering that reproduces the print form.
 *
 * The print route sorts server-side with three stable passes, so the effective
 * priority is sort_path, then serial number, then name
 * (backend/web/routes/projects.py):
 *
 *   sort(key=name.lower())
 *   sort(key=serial_key, reverse=True)
 *   sort(key=sort_path)
 *
 * Sorting by category_name instead of sort_path diverges as soon as categories
 * nest, because the leaf label says nothing about its position in the tree.
 */

type OrderableBooking = Pick<Booking, 'equipment_name' | 'serial_number'> & {
  sort_path?: number[];
};

/**
 * Element-wise comparison of ancestry paths, matching Python list ordering:
 * a shared prefix sorts before the longer path ([10, 39] before [10, 39, 93]).
 */
export function compareSortPath(a: number[] = [], b: number[] = []): number {
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

/**
 * Serial ordering as the print form produces it: the backend sorts the key
 * (0, serial) / (1, ' ') in reverse, which puts non-serialized equipment first
 * and orders serialized items by descending serial number.
 */
export function compareSerialNumber(a?: string | null, b?: string | null): number {
  const aHas = Boolean(a);
  const bHas = Boolean(b);

  if (aHas !== bHas) return aHas ? 1 : -1;
  if (!aHas) return 0;

  const left = (a as string).toLowerCase();
  const right = (b as string).toLowerCase();
  if (left === right) return 0;
  return left < right ? 1 : -1;
}

/**
 * Name comparison mirrors Python's `name.lower()` ordering by code point rather
 * than locale collation, so the two lists cannot drift apart on mixed case or
 * mixed scripts.
 */
export function compareEquipmentName(a = '', b = ''): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function comparePrintOrder(a: OrderableBooking, b: OrderableBooking): number {
  return (
    compareSortPath(a.sort_path, b.sort_path) ||
    compareSerialNumber(a.serial_number, b.serial_number) ||
    compareEquipmentName(a.equipment_name, b.equipment_name)
  );
}
