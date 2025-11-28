import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { Category, CategoryCreate } from '../../../types/category';
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
import { Checkbox } from '../../../components/ui/checkbox';

const schema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  show_in_print_overview: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null; // Edit mode if set
  parentId?: number | null; // For subcategories
  onSubmit: (data: CategoryCreate) => Promise<void>;
  isLoading?: boolean;
}

export function CategoryFormDialog({ 
  open, 
  onOpenChange, 
  category, 
  parentId,
  onSubmit,
  isLoading 
}: CategoryFormDialogProps) {
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
      description: '',
      show_in_print_overview: false
    }
  });

  useEffect(() => {
    if (open) {
      if (category) {
        setValue('name', category.name);
        setValue('description', category.description || '');
        setValue('show_in_print_overview', category.show_in_print_overview || false);
      } else {
        reset({
          name: '',
          description: '',
          show_in_print_overview: true // Default checked based on template
        });
      }
    }
  }, [open, category, reset, setValue]);

  const handleFormSubmit = (data: FormValues) => {
    onSubmit({
      name: data.name,
      description: data.description,
      show_in_print_overview: data.show_in_print_overview,
      parent_id: parentId || (category?.parent_id) || null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Редактировать категорию' : (parentId ? 'Добавить подкатегорию' : 'Добавить категорию')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" {...register('description')} />
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              control={control}
              name="show_in_print_overview"
              render={({ field }) => (
                <Checkbox 
                  id="show_in_print_overview" 
                  checked={field.value} 
                  onCheckedChange={field.onChange} 
                />
              )}
            />
            <Label htmlFor="show_in_print_overview">Отображать как заголовок в печатной форме</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>}
              {category ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
