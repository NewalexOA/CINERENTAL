import { useQuery } from '@tanstack/react-query';
import { equipmentService } from '../../../services/equipment';
import { categoriesService } from '../../../services/categories';
import { EquipmentStatus } from '../../../types/equipment';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
import { EquipmentFormDialog } from '../components/EquipmentFormDialog';
import { EquipmentDeleteDialog } from '../components/EquipmentDeleteDialog';
import { Plus, Search, QrCode, Pencil, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { flattenCategories } from '../../../utils/category-utils';

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [EquipmentStatus.AVAILABLE]: { label: 'Доступно', variant: 'success' },
  [EquipmentStatus.RENTED]: { label: 'В аренде', variant: 'default' }, // primary
  [EquipmentStatus.MAINTENANCE]: { label: 'Обслуживание', variant: 'warning' },
  [EquipmentStatus.BROKEN]: { label: 'Сломано', variant: 'destructive' },
  [EquipmentStatus.RETIRED]: { label: 'Списано', variant: 'secondary' },
};

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EquipmentStatus | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [deletingEquipment, setDeletingEquipment] = useState<Equipment | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll
  });

  const flattenedCategories = useMemo(() => categories ? flattenCategories(categories) : [], [categories]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['equipment', page, size, search, status, categoryId],
    queryFn: () => equipmentService.getPaginated({
      page,
      size,
      query: search || undefined,
      status: status as EquipmentStatus || undefined,
      category_id: categoryId as number || undefined
    })
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: EquipmentCreate) => equipmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setIsCreateOpen(false);
      toast.success('Оборудование добавлено');
    },
    onError: (err) => {
      toast.error('Ошибка при добавлении оборудования');
      console.error(err);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EquipmentUpdate }) => equipmentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEditingEquipment(null);
      toast.success('Оборудование обновлено');
    },
    onError: (err) => {
      toast.error('Ошибка при обновлении оборудования');
      console.error(err);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => equipmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDeletingEquipment(null);
      toast.success('Оборудование удалено');
    },
    onError: (err) => {
      toast.error('Ошибка при удалении (возможно есть активные бронирования)');
      console.error(err);
    }
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); 
  };

  const handleCreate = async (data: EquipmentCreate) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: EquipmentCreate) => {
    if (editingEquipment) {
      await updateMutation.mutateAsync({ id: editingEquipment.id, data: { ...data, id: editingEquipment.id } });
    }
  };

  const handleDelete = async () => {
    if (deletingEquipment) {
      await deleteMutation.mutateAsync(deletingEquipment.id);
    }
  };

  if (error) return <div className="p-8 text-center text-destructive">Ошибка загрузки данных</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Поиск по названию, серийному номеру..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          
          <Select 
            value={status || "all"} 
            onValueChange={(val) => { setStatus(val === 'all' ? '' : val as EquipmentStatus); setPage(1); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(statusMap).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={categoryId ? String(categoryId) : "all"} 
            onValueChange={(val) => { setCategoryId(val === 'all' ? '' : Number(val)); setPage(1); }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {flattenedCategories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  <span style={{ paddingLeft: `${cat.depth * 1.5}rem` }}>
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Добавить
        </Button>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Штрихкод / S/N</TableHead>
              <TableHead>Стоимость</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center">Загрузка...</TableCell>
               </TableRow>
            ) : data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground truncate max-w-[300px]">{item.description}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.category_name || item.category?.name || '-'}
                </TableCell>
                <TableCell>
                   <div className="flex flex-col text-sm">
                    <div className="flex items-center gap-1">
                      <QrCode className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-xs">{item.barcode}</span>
                    </div>
                    {item.serial_number && (
                      <span className="text-xs text-muted-foreground">SN: {item.serial_number}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.replacement_cost} ₽
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[item.status]?.variant || 'outline'}>
                    {statusMap[item.status]?.label || item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingEquipment(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingEquipment(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Оборудование не найдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Всего: {data?.total || 0}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Назад
          </Button>
          <div className="text-sm font-medium">
            Стр. {page} из {data?.pages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (data?.pages || 1) || isLoading}
          >
            Вперед
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <EquipmentFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        categories={categories || []}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <EquipmentFormDialog 
        open={!!editingEquipment} 
        onOpenChange={(val) => !val && setEditingEquipment(null)}
        equipment={editingEquipment}
        categories={categories || []}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <EquipmentDeleteDialog 
        open={!!deletingEquipment} 
        onOpenChange={(val) => !val && setDeletingEquipment(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
