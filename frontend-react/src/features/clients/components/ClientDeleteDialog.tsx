import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

interface ClientDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function ClientDeleteDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  isLoading 
}: ClientDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Удалить клиента</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить этого клиента? Это действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>}
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
