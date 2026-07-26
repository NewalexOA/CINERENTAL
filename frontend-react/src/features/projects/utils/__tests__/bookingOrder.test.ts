import { describe, it, expect } from 'vitest';
import {
  compareEquipmentName,
  compareSerialNumber,
  compareSortPath,
  comparePrintOrder
} from '../bookingOrder';

interface Row {
  equipment_name: string;
  serial_number?: string;
  sort_path?: number[];
}

function order(rows: Row[]): string[] {
  return [...rows].sort(comparePrintOrder).map((row) => row.equipment_name);
}

describe('compareSortPath', () => {
  it('orders by ancestry element by element', () => {
    expect(compareSortPath([10, 39], [10, 40])).toBeLessThan(0);
    expect(compareSortPath([11], [10, 99])).toBeGreaterThan(0);
  });

  it('puts a shared prefix before the longer path', () => {
    // Matches Python list comparison: [10, 39] < [10, 39, 93]
    expect(compareSortPath([10, 39], [10, 39, 93])).toBeLessThan(0);
  });

  it('treats a missing path as empty', () => {
    expect(compareSortPath(undefined, [1])).toBeLessThan(0);
    expect(compareSortPath(undefined, undefined)).toBe(0);
  });
});

describe('compareSerialNumber', () => {
  it('puts non-serialized equipment first', () => {
    // The backend sorts the serial key in reverse, so (1, ' ') outranks (0, x).
    expect(compareSerialNumber(undefined, 'SN-1')).toBeLessThan(0);
    expect(compareSerialNumber('SN-1', undefined)).toBeGreaterThan(0);
  });

  it('orders serialized equipment by descending serial', () => {
    expect(compareSerialNumber('SN-9', 'SN-2')).toBeLessThan(0);
    expect(compareSerialNumber('SN-2', 'SN-9')).toBeGreaterThan(0);
  });

  it('ignores case, like the backend lowercasing', () => {
    expect(compareSerialNumber('sn-5', 'SN-5')).toBe(0);
  });

  it('leaves two non-serialized rows tied for the name pass', () => {
    expect(compareSerialNumber(null, undefined)).toBe(0);
  });
});

describe('compareEquipmentName', () => {
  it('orders case-insensitively and ascending', () => {
    expect(compareEquipmentName('alpha', 'Beta')).toBeLessThan(0);
    expect(compareEquipmentName('Zeta', 'alpha')).toBeGreaterThan(0);
    expect(compareEquipmentName('Same', 'same')).toBe(0);
  });
});

describe('comparePrintOrder', () => {
  it('groups by ancestry rather than by category label', () => {
    // "Аксессуары" sorts before "Оптика" alphabetically, but its ancestry puts
    // it in a later branch — the exact case the old comparator got wrong.
    const rows: Row[] = [
      { equipment_name: 'Объектив 50mm', sort_path: [10, 39] },
      { equipment_name: 'Стойка', sort_path: [20, 15] }
    ];

    expect(order(rows)).toEqual(['Объектив 50mm', 'Стойка']);
  });

  it('applies serial then name inside one category', () => {
    const rows: Row[] = [
      { equipment_name: 'Камера B', serial_number: 'SN-2', sort_path: [1] },
      { equipment_name: 'Камера A', serial_number: 'SN-9', sort_path: [1] },
      { equipment_name: 'Кабель', sort_path: [1] }
    ];

    // Non-serialized first, then serials descending.
    expect(order(rows)).toEqual(['Кабель', 'Камера A', 'Камера B']);
  });

  it('breaks a full tie by name', () => {
    const rows: Row[] = [
      { equipment_name: 'Штатив B', sort_path: [1] },
      { equipment_name: 'Штатив A', sort_path: [1] }
    ];

    expect(order(rows)).toEqual(['Штатив A', 'Штатив B']);
  });

  it('reproduces a nested slice taken from the live API', () => {
    // Paths and names copied from GET /api/v1/projects/203 on seeded data.
    const rows: Row[] = [
      { equipment_name: 'Аккумулятор V-mount 300W', sort_path: [10, 39, 93] },
      { equipment_name: 'Аккумулятор V-mount 150W', sort_path: [10, 39, 93] },
      { equipment_name: 'Зарядное устройство', sort_path: [10, 39] },
      { equipment_name: 'Штатив', sort_path: [10] },
      { equipment_name: 'Аккумулятор V-mount 220W', sort_path: [10, 39, 93] }
    ];

    expect(order(rows)).toEqual([
      'Штатив',
      'Зарядное устройство',
      'Аккумулятор V-mount 150W',
      'Аккумулятор V-mount 220W',
      'Аккумулятор V-mount 300W'
    ]);
  });
});
