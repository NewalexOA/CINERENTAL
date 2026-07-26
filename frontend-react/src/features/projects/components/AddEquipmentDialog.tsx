import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { Barcode, Loader2, Minus, Plus, ScanLine, Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import { DateTimeRangePicker } from '../../../components/ui/date-range-picker';
import { EquipmentPicker } from '../../equipment/components/EquipmentPicker';

import { Equipment } from '../../../types/equipment';
import { Project } from '../../../types/project';
import { equipmentService } from '../../../services/equipment';
import { bookingsService } from '../../../services/bookings';
import { useGlobalScanCapture } from '../hooks/useGlobalScanCapture';

import {
  AddToCartOutcome,
  CartEntry,
  MAX_CART_ITEMS,
  MAX_QUANTITY_PER_ITEM,
  addToCart,
  cartTotalUnits,
  isSerialized,
  removeFromCart,
  setCartDates,
  setCartQuantity
} from '../utils/equipmentCart';
import { addEquipmentBatchToProject } from '../utils/addEquipmentBatch';

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

/** Toast text per cart outcome, so scanning gives immediate feedback. */
function reportOutcome(outcome: AddToCartOutcome, name: string) {
  switch (outcome) {
    case 'added':
      toast.success(`Добавлено в корзину: ${name}`, { duration: 2000 });
      break;
    case 'incremented':
      toast.success(`Количество увеличено: ${name}`, { duration: 2000 });
      break;
    case 'serialized_already_in_cart':
      toast.info(`${name} уже в корзине — серийное оборудование добавляется один раз`);
      break;
    case 'item_limit_reached':
      toast.warning(`В корзине уже ${MAX_CART_ITEMS} позиций — больше добавить нельзя`);
      break;
    case 'quantity_limit_reached':
      toast.warning(`Для «${name}» достигнут предел ${MAX_QUANTITY_PER_ITEM} шт.`);
      break;
  }
}

function AddEquipmentPanel({
  project,
  onDone
}: {
  project: Project;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [barcode, setBarcode] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mirrors `entries` so a burst of scans composes correctly before React
  // re-renders, without computing the next cart inside a state updater —
  // StrictMode invokes updaters twice, which would double every toast.
  const entriesRef = useRef<CartEntry[]>([]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const push = (equipment: Equipment) => {
    const { entries: next, outcome } = addToCart(entriesRef.current, equipment);
    entriesRef.current = next;
    setEntries(next);
    reportOutcome(outcome, equipment.name);
  };

  // Scanning adds straight to the cart — the same immediate feedback the legacy
  // project page gave, without a round trip through the search results.
  const lookupAndAdd = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || isLookingUp) return;

    setIsLookingUp(true);
    try {
      const equipment = await equipmentService.getByBarcode(trimmed);
      push(equipment);
      setBarcode('');
    } catch {
      toast.error(`Оборудование со штрихкодом ${trimmed} не найдено`);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Capture is global and ignores where the caret is, so a scan reaches the cart
  // whether focus sits in the barcode field, in the catalogue search box, or
  // nowhere at all. The field below stays for typing a code by hand.
  useGlobalScanCapture({
    onScan: (scanned) => {
      setBarcode('');
      void lookupAndAdd(scanned);
    },
    onInvalid: (scanned) => {
      setBarcode('');
      toast.error(`Не удалось распознать штрихкод: ${scanned}`);
    }
  });

  const handleSubmit = async () => {
    if (!entries.length) return;

    setIsSubmitting(true);
    try {
      const result = await addEquipmentBatchToProject({
        entries,
        projectId: project.id,
        clientId: project.client_id,
        projectStart: project.start_date,
        projectEnd: project.end_date,
        existingBookings: project.bookings ?? [],
        deps: {
          checkAvailability: (id, start, end) =>
            equipmentService.checkAvailability(id, start, end),
          createBooking: (data) => bookingsService.create(data),
          updateBooking: (id, data) => bookingsService.update(id, data)
        }
      });

      // One refresh after the whole batch, as the legacy flow did.
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

      if (result.errorCount === 0) {
        toast.success(`Добавлено позиций: ${result.successCount}`);
        setEntries([]);
        onDone();
      } else if (result.successCount > 0) {
        toast.warning(
          `Добавлено ${result.successCount} из ${entries.length}. Не удалось: ${result.errorCount}`
        );
        console.warn('Не добавлены позиции:', result.errors);
      } else {
        toast.error(`Не удалось добавить ни одной позиции: ${result.errors[0] ?? ''}`);
        console.error('Не добавлены позиции:', result.errors);
      }
    } catch (error) {
      // Per-position failures are collected inside the batch, so reaching here
      // means the batch itself broke — surface it instead of leaving the dialog
      // silently stuck.
      toast.error('Ошибка при добавлении оборудования в проект');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalUnits = cartTotalUnits(entries);

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
      {/* Search + barcode */}
      <div className="flex flex-col gap-2 min-h-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookupAndAdd(barcode);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Barcode className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              autoFocus
              className="h-7 pl-7 text-xs"
              placeholder="Штрихкод — введите и нажмите Enter"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" className="h-7" disabled={isLookingUp || !barcode.trim()}>
            {isLookingUp ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Найти'}
          </Button>
        </form>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ScanLine className="h-3 w-3" />
          Сканируйте штрихкод — позиция сразу попадёт в корзину. Код можно ввести и вручную.
        </div>

        <div className="min-h-0 flex-1">
          <EquipmentPicker onAdd={push} />
        </div>
      </div>

      {/* Cart */}
      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Корзина</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {entries.length} поз. / {totalUnits} шт.
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px]"
              disabled={!entries.length || isSubmitting}
              onClick={() => {
                if (confirm('Очистить корзину?')) setEntries([]);
              }}
            >
              Очистить
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-md border p-2 space-y-2">
          {entries.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Корзина пуста. Отсканируйте штрихкод или добавьте оборудование из списка.
            </p>
          )}

          {entries.map((entry) => (
            <div key={entry.equipment_id} className="rounded border p-2 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{entry.name}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {entry.barcode}
                    {entry.serial_number ? ` · S/N ${entry.serial_number}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!isSerialized(entry) && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() =>
                          setEntries((c) =>
                            setCartQuantity(c, entry.equipment_id, entry.quantity - 1)
                          )
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-xs">{entry.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        disabled={entry.quantity >= MAX_QUANTITY_PER_ITEM}
                        onClick={() =>
                          setEntries((c) =>
                            setCartQuantity(c, entry.equipment_id, entry.quantity + 1)
                          )
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() =>
                      setEntries((c) => removeFromCart(c, entry.equipment_id))
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Checkbox
                    checked={entry.use_project_dates}
                    onCheckedChange={(checked) =>
                      setEntries((c) =>
                        setCartDates(c, entry.equipment_id, {
                          useProjectDates: checked === true,
                          start: project.start_date,
                          end: project.end_date
                        })
                      )
                    }
                  />
                  Даты проекта
                </label>

                {!entry.use_project_dates && (
                  <DateTimeRangePicker
                    className="w-full"
                    date={
                      entry.custom_start && entry.custom_end
                        ? {
                            from: new Date(entry.custom_start),
                            to: new Date(entry.custom_end)
                          }
                        : undefined
                    }
                    setDate={(range: DateRange | undefined) =>
                      setEntries((c) =>
                        setCartDates(c, entry.equipment_id, {
                          useProjectDates: false,
                          start: range?.from ? range.from.toISOString() : null,
                          end: range?.to ? range.to.toISOString() : null
                        })
                      )
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={!entries.length || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Добавление...
            </>
          ) : (
            'Добавить в проект'
          )}
        </Button>
      </div>
    </div>
  );
}

export function AddEquipmentDialog({ open, onOpenChange, project }: AddEquipmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Добавить оборудование</DialogTitle>
          <DialogDescription>
            Сканируйте штрихкоды или выберите оборудование из списка — позиции копятся в
            корзине и добавляются в проект одной операцией.
          </DialogDescription>
        </DialogHeader>
        {open && <AddEquipmentPanel project={project} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
