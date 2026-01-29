/**
 * Equipment History Panel - Right slide-over
 * Shows status timeline and booking history for equipment
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  ExternalLink,
  History,
  Loader2,
  Package,
  User,
} from 'lucide-react';
import type {
  EquipmentTimelineEntry,
  EquipmentBooking,
} from '../../types/scanner.types';

interface EquipmentHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: number | null;
  equipmentName?: string;
}

// Mock hooks - Replace with actual hooks from API layer
function useEquipmentTimeline(_equipmentId: number | null) {
  // TODO: Implement actual API hook
  const [isLoading] = useState(false);
  const [timeline] = useState<EquipmentTimelineEntry[]>([]);

  return { timeline, isLoading };
}

function useEquipmentBookings(_equipmentId: number | null) {
  // TODO: Implement actual API hook
  const [isLoading] = useState(false);
  const [bookings] = useState<EquipmentBooking[]>([]);

  return { bookings, isLoading };
}

export function EquipmentHistoryPanel({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
}: EquipmentHistoryPanelProps) {
  const { timeline, isLoading: timelineLoading } = useEquipmentTimeline(equipmentId);
  const { bookings, isLoading: bookingsLoading } = useEquipmentBookings(equipmentId);

  const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'available') return 'success';
    if (statusLower === 'rented') return 'default';
    if (statusLower === 'maintenance') return 'warning';
    if (statusLower === 'broken') return 'destructive';
    if (statusLower === 'retired') return 'secondary';
    return 'outline';
  };

  const getBookingStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'confirmed') return 'success';
    if (statusLower === 'pending') return 'warning';
    if (statusLower === 'active') return 'default';
    if (statusLower === 'completed') return 'secondary';
    if (statusLower === 'cancelled') return 'destructive';
    return 'outline';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Equipment History</SheetTitle>
          <SheetDescription>
            {equipmentName ? (
              <span className="font-medium text-foreground">{equipmentName}</span>
            ) : (
              'Select equipment to view history'
            )}
          </SheetDescription>
        </SheetHeader>

        {!equipmentId ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No equipment selected
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Scan or select equipment to view its history
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timeline">Status Timeline</TabsTrigger>
                <TabsTrigger value="bookings">Booking History</TabsTrigger>
              </TabsList>

              {/* Status Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4 mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {timelineLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <History className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No status history available
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status changes will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="relative space-y-4">
                      {/* Vertical Timeline Line */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-border" />

                      {timeline.map((entry, index) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative pl-10"
                        >
                          {/* Timeline Dot */}
                          <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          </div>

                          {/* Timeline Content */}
                          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={getStatusBadgeVariant(entry.status)}
                                >
                                  {entry.status}
                                </Badge>
                                {entry.previous_status && (
                                  <>
                                    <span className="text-xs text-muted-foreground">
                                      from
                                    </span>
                                    <Badge
                                      variant={getStatusBadgeVariant(
                                        entry.previous_status
                                      )}
                                    >
                                      {entry.previous_status}
                                    </Badge>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(
                                  new Date(entry.changed_at),
                                  'MMM d, yyyy HH:mm'
                                )}
                              </div>
                            </div>

                            {entry.changed_by && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                Changed by {entry.changed_by}
                              </div>
                            )}

                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Booking History Tab */}
              <TabsContent value="bookings" className="space-y-4 mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No booking history available
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bookings for this equipment will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((booking, index) => (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-muted/50 rounded-lg p-4 space-y-3"
                        >
                          {/* Project Info */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {booking.project_name}
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-auto p-0"
                                >
                                  <a
                                    href={`/projects/${booking.project_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Client: {booking.client_name}
                              </p>
                            </div>
                            <Badge variant={getBookingStatusBadge(booking.status)}>
                              {booking.status}
                            </Badge>
                          </div>

                          {/* Dates */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(new Date(booking.start_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <span>→</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(new Date(booking.end_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
