import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { Equipment, EquipmentCreate, EquipmentStatus } from '../../../types/equipment';
import { Category } from '../../../types/category';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';

const statusMap: Record<string, string> = {
  [EquipmentStatus.AVAILABLE]: 'Доступно',
  [EquipmentStatus.RENTED]: 'В аренде',
  [EquipmentStatus.MAINTENANCE]: 'Обслуживание',
  [EquipmentStatus.BROKEN]: 'Сломано',
  [EquipmentStatus.RETIRED]: 'Списано',
};

const schema = z.object({
  name: z.string().min(1, "Название обязательно"),
  category_id: z.string().min(1, "Категория обязательна"),
  serial_number: z.string().optional(),
  barcode: z.string().optional(),
  replacement_cost: z.coerce.number().min(0, "Стоимость не может быть отрицательной"),
  status: z.nativeEnum(EquipmentStatus).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EquipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  categories: Category[];
  onSubmit: (data: EquipmentCreate) => Promise<void>;
  isLoading?: boolean;
}

export function EquipmentFormDialog({ 
  open, 
  onOpenChange, 
  equipment, 
  categories,
  onSubmit,
  isLoading 
}: EquipmentFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category_id: '',
      serial_number: '',
      barcode: '',
      replacement_cost: 0,
      description: '',
      notes: '',
      status: EquipmentStatus.AVAILABLE
    }
  });

  useEffect(() => {
    if (open) {
      if (equipment) {
        setValue('name', equipment.name);
        setValue('category_id', String(equipment.category_id));
        setValue('serial_number', equipment.serial_number || '');
        setValue('barcode', equipment.barcode);
        setValue('replacement_cost', equipment.replacement_cost);
        setValue('description', equipment.description || '');
        setValue('notes', equipment.notes || '');
        setValue('status', equipment.status);
      } else {
        reset({
          name: '',
          category_id: '',
          serial_number: '',
          barcode: '', 
          replacement_cost: 0,
          description: '',
          notes: '',
          status: EquipmentStatus.AVAILABLE
        });
      }
    }
  }, [open, equipment, reset, setValue]);

  const handleFormSubmit = (data: FormValues) => {
    onSubmit({
      name: data.name,
      category_id: Number(data.category_id),
      serial_number: data.serial_number || undefined,
      barcode: data.barcode || undefined,
      replacement_cost: data.replacement_cost,
      description: data.description,
      notes: data.notes,
      status: data.status,
    }); 
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipment ? 'Редактировать оборудование' : 'Добавить оборудование'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Категория *</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && <p className="text-sm text-destructive">{errors.category_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Серийный номер</Label>
              <Input id="serial_number" {...register('serial_number')} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">Штрихкод (пусто = авто)</Label>
              <Input id="barcode" {...register('barcode')} placeholder="Автоматически" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="replacement_cost">Стоимость замены (₽) *</Label>
              <Input id="replacement_cost" type="number" {...register('replacement_cost')} />
              {errors.replacement_cost && <p className="text-sm text-destructive">{errors.replacement_cost.message}</p>}
            </div>

            {equipment && (
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusMap).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>}
              {equipment ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
