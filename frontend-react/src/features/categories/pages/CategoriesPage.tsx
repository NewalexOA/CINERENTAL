import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '../../../services/categories';
import { Category, CategoryCreate, CategoryUpdate } from '../../../types/category';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { CategoryFormDialog } from '../components/CategoryFormDialog';
import { SubcategoriesDialog } from '../components/SubcategoriesDialog';
import { ClientDeleteDialog } from '../../clients/components/ClientDeleteDialog'; // Reuse
import { Plus, Pencil, Trash2, Search, FolderTree } from 'lucide-react';
import { useState } from 'react';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [subcategoriesParent, setSubcategoriesParent] = useState<Category | null>(null);

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAllWithCount
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CategoryCreate) => categoriesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCreateOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) => categoriesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeletingCategory(null);
    }
  });

  // Filter root categories, sort by ID, and apply search
  const filteredCategories = categories
    ?.filter(cat => !cat.parent_id) // Show only root categories
    .sort((a, b) => a.id - b.id) // Sort by ID (matches legacy frontend)
    .filter(cat =>
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.description?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-2xl font-bold tracking-tight mr-4">Категории</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Поиск категорий..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Добавить категорию
        </Button>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Оборудование</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">Загрузка...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-destructive">Ошибка загрузки</TableCell>
              </TableRow>
            ) : filteredCategories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">Категории не найдены</TableCell>
              </TableRow>
            ) : (
              filteredCategories?.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>{cat.id}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{cat.name}</span>
                      {cat.description && <span className="text-xs text-muted-foreground truncate max-w-[300px]">{cat.description}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{cat.equipment_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSubcategoriesParent(cat)}>
                        <FolderTree className="h-3 w-3 mr-2" />
                        Подкатегории
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingCategory(cat)}>
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

      {/* Dialogs */}
      <CategoryFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
        isLoading={createMutation.isPending}
      />

      <CategoryFormDialog
        open={!!editingCategory}
        onOpenChange={(val) => !val && setEditingCategory(null)}
        category={editingCategory}
        onSubmit={async (data) => { if (editingCategory) await updateMutation.mutateAsync({ id: editingCategory.id, data: data as any }); }}
        isLoading={updateMutation.isPending}
      />

      <ClientDeleteDialog
        open={!!deletingCategory}
        onOpenChange={(val) => !val && setDeletingCategory(null)}
        onConfirm={async () => { if (deletingCategory) await deleteMutation.mutateAsync(deletingCategory.id); }}
        isLoading={deleteMutation.isPending}
      />

      <SubcategoriesDialog
        open={!!subcategoriesParent}
        onOpenChange={(val) => !val && setSubcategoriesParent(null)}
        parentCategory={subcategoriesParent}
      />
    </div>
  );
}
