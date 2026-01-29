import { motion, AnimatePresence } from 'framer-motion';
import { ScanBarcode, History, Settings } from 'lucide-react';
import { Equipment, EquipmentStatus } from '@/types/equipment';
import { ScanFeedbackType } from '../../types/scanner.types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScanResultCardProps {
  equipment: Equipment | null;
  isLoading?: boolean;
  feedbackType?: ScanFeedbackType;
  onViewHistory?: () => void;
  onUpdateStatus?: () => void;
}

/**
 * Status badge color mapping
 */
const getStatusBadgeVariant = (status: EquipmentStatus): 'success' | 'default' | 'warning' | 'destructive' => {
  switch (status) {
    case EquipmentStatus.AVAILABLE:
      return 'success';
    case EquipmentStatus.RENTED:
      return 'default';
    case EquipmentStatus.MAINTENANCE:
      return 'warning';
    case EquipmentStatus.BROKEN:
      return 'destructive';
    case EquipmentStatus.RETIRED:
      return 'destructive';
    default:
      return 'default';
  }
};

/**
 * Status display text mapping
 */
const getStatusDisplayText = (status: EquipmentStatus): string => {
  switch (status) {
    case EquipmentStatus.AVAILABLE:
      return 'Доступно';
    case EquipmentStatus.RENTED:
      return 'Арендовано';
    case EquipmentStatus.MAINTENANCE:
      return 'На обслуживании';
    case EquipmentStatus.BROKEN:
      return 'Сломано';
    case EquipmentStatus.RETIRED:
      return 'Списано';
    default:
      return status;
  }
};

/**
 * Card animation variants based on feedback type
 */
const getCardAnimation = (feedbackType?: ScanFeedbackType) => {
  switch (feedbackType) {
    case 'success':
      return {
        initial: { scale: 0.95, opacity: 0 },
        animate: {
          scale: 1,
          opacity: 1,
          boxShadow: [
            '0 0 0 0 rgba(34, 197, 94, 0)',
            '0 0 0 10px rgba(34, 197, 94, 0.2)',
            '0 0 0 0 rgba(34, 197, 94, 0)',
          ],
        },
        transition: { duration: 0.5 },
      };
    case 'duplicate':
      return {
        initial: { x: 0 },
        animate: {
          x: [-10, 10, -10, 10, 0],
          backgroundColor: ['rgba(234, 179, 8, 0)', 'rgba(234, 179, 8, 0.1)', 'rgba(234, 179, 8, 0)'],
        },
        transition: { duration: 0.5 },
      };
    case 'quantity_updated':
      return {
        initial: { scale: 1 },
        animate: {
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 0 0 rgba(59, 130, 246, 0)',
            '0 0 0 10px rgba(59, 130, 246, 0.2)',
            '0 0 0 0 rgba(59, 130, 246, 0)',
          ],
        },
        transition: { duration: 0.5 },
      };
    case 'not_found':
    case 'error':
      return {
        initial: { x: 0 },
        animate: {
          x: [-5, 5, -5, 5, 0],
          backgroundColor: ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0)'],
        },
        transition: { duration: 0.4 },
      };
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3 },
      };
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * ScanResultCard Component
 *
 * Displays the last scanned equipment with status, details, and action buttons.
 * Shows empty state when no equipment is scanned.
 * Provides visual feedback animations based on scan result.
 */
export function ScanResultCard({
  equipment,
  isLoading,
  feedbackType,
  onViewHistory,
  onUpdateStatus,
}: ScanResultCardProps) {
  const animation = getCardAnimation(feedbackType);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <Card className="w-full">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="h-6 w-24 bg-muted animate-pulse rounded" />
              <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-5 w-1/2 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
            <div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
          </CardFooter>
        </Card>
      ) : equipment ? (
        <motion.div
          key={equipment.id}
          initial={animation.initial}
          animate={animation.animate}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={animation.transition}
        >
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold tracking-tight">{equipment.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {equipment.category_name || 'Без категории'}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(equipment.status)} className="ml-2">
                  {getStatusDisplayText(equipment.status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Штрих-код</p>
                  <p className="font-mono font-medium">{equipment.barcode}</p>
                </div>

                {equipment.serial_number && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Серийный номер</p>
                    <p className="font-mono font-medium">{equipment.serial_number}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Стоимость</p>
                  <motion.p
                    className="font-medium"
                    animate={
                      feedbackType === 'quantity_updated'
                        ? { scale: [1, 1.1, 1], color: ['inherit', '#3b82f6', 'inherit'] }
                        : {}
                    }
                    transition={{ duration: 0.3 }}
                  >
                    {formatCurrency(equipment.replacement_cost)}
                  </motion.p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono font-medium">#{equipment.id}</p>
                </div>
              </div>

              {equipment.description && (
                <div className="mt-4 pt-4 border-t space-y-1">
                  <p className="text-sm text-muted-foreground">Описание</p>
                  <p className="text-sm">{equipment.description}</p>
                </div>
              )}

              {equipment.notes && (
                <div className="mt-4 pt-4 border-t space-y-1">
                  <p className="text-sm text-muted-foreground">Примечания</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">{equipment.notes}</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={onViewHistory}
                disabled={!onViewHistory}
                className="flex-1"
              >
                <History className="mr-2 h-4 w-4" />
                История
              </Button>
              <Button
                variant="outline"
                onClick={onUpdateStatus}
                disabled={!onUpdateStatus}
                className="flex-1"
              >
                <Settings className="mr-2 h-4 w-4" />
                Изменить статус
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full">
            <CardContent className={cn(
              "flex flex-col items-center justify-center py-12",
              "text-muted-foreground"
            )}>
              <ScanBarcode className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Отсканируйте оборудование</h3>
              <p className="text-sm text-center max-w-sm">
                Используйте сканер штрих-кодов или введите код вручную для просмотра информации об оборудовании
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
