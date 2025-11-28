import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { CartItem } from '../../../context/CartContext';

interface ItemDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartItem | null;
  onSave: (id: number, dates: { start: string; end: string }) => void;
}

export function ItemDatesDialog({ 
  open, 
  onOpenChange, 
  item, 
  onSave 
}: ItemDatesDialogProps) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (item && open) {
      // Handle "YYYY-MM-DD" from ISO string
      setStart(item.startDate ? item.startDate.split('T')[0] : '');
      setEnd(item.endDate ? item.endDate.split('T')[0] : '');
    }
  }, [item, open]);

  const handleSave = () => {
    if (item && start && end) {
      onSave(item.id, { start, end });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Период бронирования</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4">
            <p className="font-medium">{item?.name}</p>
            <p className="text-sm text-muted-foreground">{item?.barcode}</p>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Начало</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Окончание</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
