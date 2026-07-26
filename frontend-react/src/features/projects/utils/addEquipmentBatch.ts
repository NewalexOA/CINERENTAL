import { isSameMinute, parseISO } from 'date-fns';
import { Booking, BookingCreate, BookingUpdate } from '../../../services/bookings';
import { CartEntry, isSerialized, resolveEntryDates } from './equipmentCart';

/**
 * Bulk transfer of the staging cart into a project, porting the legacy
 * addEquipmentBatchToProject business rules:
 *
 * - each position books either its own period or the project period;
 * - serialized equipment is availability-checked and rejected on conflict;
 * - non-serialized equipment merges into a booking that already covers the
 *   same equipment over the same period, bumping its quantity;
 * - failures are collected per position instead of aborting the whole batch.
 */

export interface AvailabilityConflict {
  start_date?: string;
  end_date?: string;
  project_name?: string;
}

export interface BatchDeps {
  checkAvailability: (
    equipmentId: number,
    start: string,
    end: string
  ) => Promise<{ is_available: boolean; conflicts?: AvailabilityConflict[]; message?: string }>;
  createBooking: (data: BookingCreate) => Promise<unknown>;
  updateBooking: (bookingId: number, data: BookingUpdate) => Promise<unknown>;
}

export interface BatchInput {
  entries: CartEntry[];
  projectId: number;
  clientId: number;
  projectStart: string;
  projectEnd: string;
  existingBookings: Booking[];
  deps: BatchDeps;
}

export interface BatchResult {
  successCount: number;
  errorCount: number;
  errors: string[];
}

function samePeriod(booking: Booking, start: string, end: string): boolean {
  try {
    return (
      isSameMinute(parseISO(booking.start_date), parseISO(start)) &&
      isSameMinute(parseISO(booking.end_date), parseISO(end))
    );
  } catch {
    return false;
  }
}

function describeConflicts(conflicts?: AvailabilityConflict[]): string {
  if (!conflicts?.length) return '';
  return conflicts
    .map((conflict) => {
      const period = [conflict.start_date, conflict.end_date].filter(Boolean).join(' - ');
      return conflict.project_name ? `${period} (проект: ${conflict.project_name})` : period;
    })
    .filter(Boolean)
    .join('; ');
}

export async function addEquipmentBatchToProject({
  entries,
  projectId,
  clientId,
  projectStart,
  projectEnd,
  existingBookings,
  deps
}: BatchInput): Promise<BatchResult> {
  let successCount = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const { start, end } = resolveEntryDates(entry, projectStart, projectEnd);

    try {
      if (isSerialized(entry)) {
        const availability = await deps.checkAvailability(entry.equipment_id, start, end);

        if (!availability.is_available) {
          const conflicts = describeConflicts(availability.conflicts);
          errors.push(
            conflicts
              ? `${entry.name}: недоступно на выбранные даты. Конфликты: ${conflicts}`
              : `${entry.name}: ${availability.message || 'недоступно на выбранные даты'}`
          );
          continue;
        }

        await deps.createBooking({
          project_id: projectId,
          client_id: clientId,
          equipment_id: entry.equipment_id,
          start_date: start,
          end_date: end,
          quantity: 1,
          total_amount: 0
        });
        successCount++;
        continue;
      }

      const mergeTarget = existingBookings.find(
        (booking) =>
          booking.equipment_id === entry.equipment_id && samePeriod(booking, start, end)
      );

      if (mergeTarget) {
        await deps.updateBooking(mergeTarget.id, {
          quantity: mergeTarget.quantity + entry.quantity
        });
      } else {
        await deps.createBooking({
          project_id: projectId,
          client_id: clientId,
          equipment_id: entry.equipment_id,
          start_date: start,
          end_date: end,
          quantity: entry.quantity,
          total_amount: 0
        });
      }
      successCount++;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`${entry.name}: ${detail}`);
    }
  }

  return { successCount, errorCount: errors.length, errors };
}
