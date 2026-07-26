import { describe, it, expect, vi } from 'vitest';
import { Booking } from '../../../../services/bookings';
import { CartEntry } from '../equipmentCart';
import { BatchDeps, addEquipmentBatchToProject } from '../addEquipmentBatch';

const PROJECT_START = '2026-08-01T10:00:00.000Z';
const PROJECT_END = '2026-08-10T18:00:00.000Z';

function makeEntry(overrides: Partial<CartEntry> = {}): CartEntry {
  return {
    equipment_id: 1,
    name: 'XLR cable',
    barcode: '00000000101',
    replacement_cost: 1000,
    quantity: 1,
    use_project_dates: true,
    custom_start: null,
    custom_end: null,
    ...overrides
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 500,
    project_id: 10,
    client_id: 3,
    equipment_id: 1,
    start_date: PROJECT_START,
    end_date: PROJECT_END,
    quantity: 2,
    total_amount: 0,
    booking_status: 'ACTIVE',
    payment_status: 'PENDING',
    created_at: PROJECT_START,
    updated_at: PROJECT_START,
    equipment_name: 'XLR cable',
    client_name: 'ACME',
    ...overrides
  } as Booking;
}

function makeDeps(overrides: Partial<BatchDeps> = {}): BatchDeps {
  return {
    checkAvailability: vi.fn(async () => ({ is_available: true })),
    createBooking: vi.fn(async () => ({})),
    updateBooking: vi.fn(async () => ({})),
    ...overrides
  };
}

function run(entries: CartEntry[], existingBookings: Booking[], deps: BatchDeps) {
  return addEquipmentBatchToProject({
    entries,
    projectId: 10,
    clientId: 3,
    projectStart: PROJECT_START,
    projectEnd: PROJECT_END,
    existingBookings,
    deps
  });
}

describe('addEquipmentBatchToProject', () => {
  it('creates a booking for a non-serialized item with no match', async () => {
    const deps = makeDeps();
    const result = await run([makeEntry({ quantity: 3 })], [], deps);

    expect(result).toEqual({ successCount: 1, errorCount: 0, errors: [] });
    expect(deps.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ equipment_id: 1, quantity: 3, start_date: PROJECT_START })
    );
    expect(deps.checkAvailability).not.toHaveBeenCalled();
  });

  it('merges into an existing booking over the same period', async () => {
    const deps = makeDeps();
    const result = await run([makeEntry({ quantity: 3 })], [makeBooking()], deps);

    expect(result.successCount).toBe(1);
    expect(deps.updateBooking).toHaveBeenCalledWith(500, { quantity: 5 });
    expect(deps.createBooking).not.toHaveBeenCalled();
  });

  it('does not merge into a booking with a different period', async () => {
    const deps = makeDeps();
    const shifted = makeBooking({ start_date: '2026-09-01T10:00:00.000Z' });
    await run([makeEntry()], [shifted], deps);

    expect(deps.updateBooking).not.toHaveBeenCalled();
    expect(deps.createBooking).toHaveBeenCalled();
  });

  it('checks availability for serialized equipment and books it', async () => {
    const deps = makeDeps();
    const result = await run(
      [makeEntry({ equipment_id: 7, name: 'Alexa Mini', serial_number: 'SN-1' })],
      [],
      deps
    );

    expect(deps.checkAvailability).toHaveBeenCalledWith(7, PROJECT_START, PROJECT_END);
    expect(result.successCount).toBe(1);
  });

  it('rejects serialized equipment that conflicts, listing the conflict', async () => {
    const deps = makeDeps({
      checkAvailability: vi.fn(async () => ({
        is_available: false,
        conflicts: [
          {
            start_date: '2026-08-02',
            end_date: '2026-08-03',
            project_name: 'Другой проект'
          }
        ]
      }))
    });

    const result = await run(
      [makeEntry({ equipment_id: 7, name: 'Alexa Mini', serial_number: 'SN-1' })],
      [],
      deps
    );

    expect(result).toMatchObject({ successCount: 0, errorCount: 1 });
    expect(result.errors[0]).toContain('Alexa Mini');
    expect(result.errors[0]).toContain('Другой проект');
    expect(deps.createBooking).not.toHaveBeenCalled();
  });

  it('books a per-item period when the entry overrides the project dates', async () => {
    const deps = makeDeps();
    await run(
      [
        makeEntry({
          use_project_dates: false,
          custom_start: '2026-08-03T00:00:00.000Z',
          custom_end: '2026-08-04T00:00:00.000Z'
        })
      ],
      [makeBooking()],
      deps
    );

    // The existing booking covers the project period, not this one — no merge.
    expect(deps.updateBooking).not.toHaveBeenCalled();
    expect(deps.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ start_date: '2026-08-03T00:00:00.000Z' })
    );
  });

  it('keeps going after a failure and reports it per position', async () => {
    const deps = makeDeps({
      createBooking: vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({})
    });

    const result = await run(
      [makeEntry({ equipment_id: 1 }), makeEntry({ equipment_id: 2, name: 'Штатив' })],
      [],
      deps
    );

    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.errors[0]).toBe('XLR cable: boom');
  });
});
