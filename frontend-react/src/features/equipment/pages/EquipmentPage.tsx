import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentService } from '../../../services/equipment';
import { categoriesService } from '../../../services/categories';
import { Equipment, EquipmentCreate, EquipmentUpdate, EquipmentStatus } from '../../../types/equipment';
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
import { Input } from '../../../components/ui/input';
import { EquipmentFormDialog } from '../components/EquipmentFormDialog';
import { EquipmentDeleteDialog } from '../components/EquipmentDeleteDialog';
import { Plus, Search, QrCode, Pencil, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { flattenCategories } from '../../../utils/category-utils';
import { PaginationControls } from '../../../components/ui/pagination-controls';

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [EquipmentStatus.AVAILABLE]: { label: 'Доступно', variant: 'success' },
  [EquipmentStatus.RENTED]: { label: 'В аренде', variant: 'default' },
  [EquipmentStatus.MAINTENANCE]: { label: 'Обслуживание', variant: 'warning' },
  [EquipmentStatus.BROKEN]: { label: 'Сломано', variant: 'destructive' },
  [EquipmentStatus.RETIRED]: { label: 'Списано', variant: 'secondary' },
};

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
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
    <div className="h-full flex flex-col space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию..."
              className="h-7 pl-7 text-xs"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          
          <Select 
            value={status || "all"} 
            onValueChange={(val) => { setStatus(val === 'all' ? '' : val as EquipmentStatus); setPage(1); }}
          >
            <SelectTrigger className="w-[140px] h-7 text-xs">
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
            <SelectTrigger className="w-[200px] h-7 text-xs">
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

        <Button size="sm" className="h-7 text-xs" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-1 h-3 w-3" /> Добавить
        </Button>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 py-0">Название</TableHead>
              <TableHead className="h-8 py-0">Категория</TableHead>
              <TableHead className="h-8 py-0">Штрихкод / S/N</TableHead>
              <TableHead className="h-8 py-0">Стоимость</TableHead>
              <TableHead className="h-8 py-0">Статус</TableHead>
              <TableHead className="h-8 py-0 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center">Загрузка...</TableCell>
               </TableRow>
            ) : data?.items.map((item) => (
              <TableRow key={item.id} className="h-8 hover:bg-muted/50">
                <TableCell className="py-1 font-medium">
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.description && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">{item.description}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1">
                  {item.category_name || item.category?.name || '-'}
                </TableCell>
                <TableCell className="py-1">
                   <div className="flex flex-col text-[10px]">
                    <div className="flex items-center gap-1">
                      <QrCode className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{item.barcode}</span>
                    </div>
                    {item.serial_number && (
                      <span className="text-muted-foreground">SN: {item.serial_number}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1">
                  {item.replacement_cost} ₽
                </TableCell>
                <TableCell className="py-1">
                  <Badge variant={statusMap[item.status]?.variant || 'outline'} className="px-1.5 py-0 text-[10px] h-5">
                    {statusMap[item.status]?.label || item.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-1 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingEquipment(item)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeletingEquipment(item)}>
                      <Trash2 className="h-3 w-3" />
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

      <PaginationControls 
        currentPage={page}
        totalPages={data?.pages || 1}
        pageSize={size}
        totalItems={data?.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setSize}
        disabled={isLoading}
      />

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
