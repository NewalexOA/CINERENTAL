/**
 * Scanner API
 * Central export for all scanner-related TanStack Query hooks
 */

// Scan Sessions API
export {
  useScanSessions,
  useScanSession,
  useCreateScanSession,
  useUpdateScanSession,
  useDeleteScanSession,
  useCleanExpiredSessions
} from './scanSessionsApi';

// Equipment API (Scanner Context)
export {
  useEquipmentByBarcode,
  useEquipmentTimeline,
  useEquipmentBookings,
  useUpdateEquipmentStatus,
  prefetchEquipmentByBarcode
} from './equipmentApi';
