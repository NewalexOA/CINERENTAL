import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { Client } from '../../../types/client';
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
import { Textarea } from '../../../components/ui/textarea';

const strictSchema = z.object({
  name: z.string().min(1, "ФИО обязательно"),
  company: z.string().optional(),
  email: z.string().email("Некорректный email").or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof strictSchema>;

// Type for cleaned/submitted data (empty strings converted to undefined)
export interface ClientSubmitData {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null; // If present, edit mode
  onSubmit: (data: ClientSubmitData) => Promise<void>;
  isLoading?: boolean;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
  isLoading
}: ClientFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(strictSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      notes: ''
    }
  });

  useEffect(() => {
    if (open) {
      if (client) {
        setValue('name', client.name);
        setValue('company', client.company || '');
        setValue('email', client.email || '');
        setValue('phone', client.phone || '');
        setValue('notes', client.notes || '');
      } else {
        reset({
          name: '',
          company: '',
          email: '',
          phone: '',
          notes: ''
        });
      }
    }
  }, [open, client, reset, setValue]);

  const handleFormSubmit = async (data: FormValues) => {
    // Clean up empty strings to undefined for backend (converts to null)
    const cleanedData: ClientSubmitData = {
      name: data.name,
      company: data.company || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
    };
    await onSubmit(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !isLoading && onOpenChange(open)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{client ? 'Редактировать клиента' : 'Добавить клиента'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ФИО <span className="text-destructive">*</span></Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Компания</Label>
            <Input id="company" {...register('company')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" type="tel" {...register('phone')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
