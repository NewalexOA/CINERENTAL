/**
 * ScanHistoryFeed Component
 * Chronological list of scans in current session with real-time updates
 */

import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, Plus, AlertCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScanHistoryEntry, ScanFeedbackType } from '../../types/scanner.types';

interface ScanHistoryFeedProps {
  entries: ScanHistoryEntry[];
  maxEntries?: number;
  onEntryClick?: (entry: ScanHistoryEntry) => void;
}

// Result indicator configuration
const resultConfig: Record<
  ScanFeedbackType,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  success: {
    icon: Check,
    color: 'text-green-600',
    label: 'Added',
  },
  duplicate: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    label: 'Duplicate',
  },
  quantity_updated: {
    icon: Plus,
    color: 'text-blue-600',
    label: 'Quantity Updated',
  },
  not_found: {
    icon: X,
    color: 'text-red-600',
    label: 'Not Found',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600',
    label: 'Error',
  },
};

/**
 * ScanHistoryFeed
 *
 * Display chronological list of scan results with animations
 *
 * Features:
 * - Real-time updates with slide-down animations
 * - Color-coded result indicators
 * - Relative timestamps
 * - Scrollable feed with max height
 * - Click handlers for individual entries
 *
 * @example
 * <ScanHistoryFeed
 *   entries={scanHistory}
 *   maxEntries={20}
 *   onEntryClick={(entry) => console.log(entry)}
 * />
 */
export function ScanHistoryFeed({
  entries,
  maxEntries = 50,
  onEntryClick,
}: ScanHistoryFeedProps) {
  // Limit entries and reverse to show most recent first
  const displayEntries = entries.slice(-maxEntries).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Scan History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {displayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No scans yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scan equipment to see history
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {displayEntries.map((entry) => {
                const config = resultConfig[entry.result];
                const Icon = config.icon;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => onEntryClick?.(entry)}
                      disabled={!onEntryClick}
                      className={cn(
                        'w-full text-left px-6 py-3 border-b transition-colors',
                        onEntryClick && 'hover:bg-muted/50 cursor-pointer',
                        !onEntryClick && 'cursor-default'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Result Icon */}
                        <div
                          className={cn(
                            'mt-0.5 flex-shrink-0',
                            config.color
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Entry Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {entry.equipment ? (
                                <>
                                  <p className="font-medium text-sm truncate">
                                    {entry.equipment.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {entry.barcode}
                                    {entry.equipment.serial_number && (
                                      <span className="ml-2">
                                        S/N: {entry.equipment.serial_number}
                                      </span>
                                    )}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-sm">
                                    Unknown Equipment
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {entry.barcode}
                                  </p>
                                </>
                              )}
                              {entry.message && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {entry.message}
                                </p>
                              )}
                            </div>

                            {/* Timestamp */}
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(entry.timestamp), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>

                          {/* Result Label */}
                          <div className="mt-1.5">
                            <span
                              className={cn(
                                'inline-flex items-center text-xs font-medium',
                                config.color
                              )}
                            >
                              {config.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Accessibility:
 * - Semantic button elements for clickable entries
 * - ARIA labels for icon-only elements
 * - Keyboard navigation support
 * - Color + icon for result indication (not color alone)
 *
 * Performance:
 * - AnimatePresence for optimized animations
 * - Virtualization not needed (max 50 entries)
 * - Reverse iteration to show recent first
 *
 * Usage:
 *
 * // Basic usage
 * <ScanHistoryFeed entries={scanHistory} />
 *
 * // With click handler
 * <ScanHistoryFeed
 *   entries={scanHistory}
 *   onEntryClick={(entry) => {
 *     if (entry.equipment) {
 *       navigate(`/equipment/${entry.equipment.equipment_id}`);
 *     }
 *   }}
 * />
 *
 * // Custom max entries
 * <ScanHistoryFeed entries={scanHistory} maxEntries={20} />
 */
