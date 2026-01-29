import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EquipmentStatus } from '@/types/equipment';

interface StatusUpdateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: number | null;
  currentStatus: string;
  onStatusUpdate: (status: string) => void;
  isUpdating?: boolean;
}

/**
 * Status options with display info
 */
const STATUS_OPTIONS = [
  {
    value: EquipmentStatus.AVAILABLE,
    label: 'Доступно',
    description: 'Оборудование готово к аренде',
    color: 'bg-green-500',
    badgeVariant: 'success' as const,
  },
  {
    value: EquipmentStatus.MAINTENANCE,
    label: 'На обслуживании',
    description: 'Плановое техническое обслуживание',
    color: 'bg-yellow-500',
    badgeVariant: 'warning' as const,
  },
  {
    value: EquipmentStatus.BROKEN,
    label: 'Сломано',
    description: 'Требуется ремонт',
    color: 'bg-red-500',
    badgeVariant: 'destructive' as const,
  },
  {
    value: EquipmentStatus.RETIRED,
    label: 'Списано',
    description: 'Оборудование выведено из эксплуатации',
    color: 'bg-gray-500',
    badgeVariant: 'secondary' as const,
  },
];

/**
 * StatusUpdateSheet Component
 *
 * Bottom sheet for updating equipment status.
 * Shows radio-button style selection with status descriptions.
 */
export function StatusUpdateSheet({
  open,
  onOpenChange,
  equipmentId,
  currentStatus,
  onStatusUpdate,
  isUpdating = false,
}: StatusUpdateSheetProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);

  const handleStatusSelect = (status: string) => {
    if (status !== currentStatus && !isUpdating) {
      setSelectedStatus(status);
    }
  };

  const handleConfirm = () => {
    if (selectedStatus !== currentStatus && !isUpdating) {
      onStatusUpdate(selectedStatus);
    }
  };

  // Reset selected status when sheet opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedStatus(currentStatus);
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Изменить статус</DrawerTitle>
            <DrawerDescription>
              Выберите новый статус для оборудования
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-2">
            {STATUS_OPTIONS.map((option) => {
              const isSelected = selectedStatus === option.value;
              const isCurrent = currentStatus === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  disabled={isCurrent || isUpdating}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg border transition-all",
                    "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
                    isSelected && !isCurrent && "border-primary bg-primary/5",
                    isCurrent && "opacity-50 cursor-not-allowed bg-muted",
                    !isSelected && !isCurrent && "border-border"
                  )}
                >
                  {/* Status color indicator */}
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full shrink-0",
                      option.color
                    )}
                  />

                  {/* Status info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Текущий
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && !isCurrent && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <DrawerFooter>
            <Button
              onClick={handleConfirm}
              disabled={selectedStatus === currentStatus || isUpdating || !equipmentId}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Обновление...
                </>
              ) : (
                'Обновить статус'
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Отмена
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
