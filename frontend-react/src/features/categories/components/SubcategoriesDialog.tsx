import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { categoriesService } from '../../../services/categories';
import { Category, CategoryCreate } from '../../../types/category';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../../components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { CategoryFormDialog } from './CategoryFormDialog';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';

interface SubcategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCategory: Category | null;
}

export function SubcategoriesDialog({
  open,
  onOpenChange,
  parentCategory
}: SubcategoriesDialogProps) {
  const queryClient = useQueryClient();
  const [editingSub, setEditingSub] = useState<Category | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingSub, setDeletingSub] = useState<Category | null>(null);

  // Fetch subcategories
  const { data: subcategories, isLoading } = useQuery({
    queryKey: ['subcategories', parentCategory?.id],
    queryFn: () => parentCategory ? categoriesService.getSubcategories(parentCategory.id) : Promise.resolve([]),
    enabled: !!parentCategory && open,
    staleTime: 30_000, // 30 seconds
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryCreate) => categoriesService.create(data),
    onSuccess: async () => {
      // Await invalidations to prevent race conditions
      await queryClient.invalidateQueries({ queryKey: ['subcategories', parentCategory?.id] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddOpen(false);
      toast.success('Подкатегория создана');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка создания: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryCreate> }) => categoriesService.update(id, data),
    onSuccess: async () => {
      // Await invalidations to prevent race conditions
      await queryClient.invalidateQueries({ queryKey: ['subcategories', parentCategory?.id] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingSub(null);
      toast.success('Подкатегория обновлена');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка обновления: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: async () => {
      // Await invalidations to prevent race conditions
      await queryClient.invalidateQueries({ queryKey: ['subcategories', parentCategory?.id] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeletingSub(null);
      toast.success('Подкатегория удалена');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка удаления: ${error.message}`);
    },
  });

  // Memoize sorted subcategories
  const sortedSubcategories = useMemo(
    () => [...(subcategories || [])].sort((a, b) => a.id - b.id),
    [subcategories]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Подкатегории: {parentCategory?.name}</DialogTitle>
          </DialogHeader>

          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Добавить подкатегорию
            </Button>
          </div>

          <div className="border rounded-md max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">Загрузка...</TableCell>
                  </TableRow>
                ) : sortedSubcategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Нет подкатегорий</TableCell>
                  </TableRow>
                ) : (
                  sortedSubcategories.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.id}</TableCell>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingSub(sub)}
                            disabled={updateMutation.isPending || deleteMutation.isPending}
                            aria-label={`Редактировать ${sub.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingSub(sub)}
                            disabled={updateMutation.isPending || deleteMutation.isPending}
                            aria-label={`Удалить ${sub.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Dialogs */}
      {isAddOpen && (
        <CategoryFormDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          parentId={parentCategory?.id}
          onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
          isLoading={createMutation.isPending}
        />
      )}

      {editingSub && (
        <CategoryFormDialog
          open={!!editingSub}
          onOpenChange={(val) => !val && setEditingSub(null)}
          category={editingSub}
          onSubmit={async (data) => { await updateMutation.mutateAsync({ id: editingSub.id, data }); }}
          isLoading={updateMutation.isPending}
        />
      )}

      {deletingSub && (
        <ConfirmDeleteDialog
          open={!!deletingSub}
          onOpenChange={(val) => !val && setDeletingSub(null)}
          onConfirm={async () => {
            try {
              await deleteMutation.mutateAsync(deletingSub.id);
            } catch {
              // Error already handled in onError callback
            }
          }}
          isLoading={deleteMutation.isPending}
          title="Удалить подкатегорию"
          description={`Вы уверены, что хотите удалить подкатегорию "${deletingSub.name}"? Это действие нельзя отменить.`}
        />
      )}
    </>
  );
}
