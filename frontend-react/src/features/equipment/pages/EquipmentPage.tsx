import { useQuery } from '@tanstack/react-query';
import { equipmentService } from '@/services/equipment';
import { categoriesService } from '@/services/categories';
import { EquipmentStatus } from '@/types/equipment';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, QrCode } from 'lucide-react';
import { useState } from 'react';

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [EquipmentStatus.AVAILABLE]: { label: 'Доступно', variant: 'success' },
  [EquipmentStatus.RENTED]: { label: 'В аренде', variant: 'default' }, // primary
  [EquipmentStatus.MAINTENANCE]: { label: 'Обслуживание', variant: 'warning' },
  [EquipmentStatus.BROKEN]: { label: 'Сломано', variant: 'destructive' },
  [EquipmentStatus.RETIRED]: { label: 'Списано', variant: 'secondary' },
};

export default function EquipmentPage() {
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EquipmentStatus | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll
  });

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value as EquipmentStatus | '');
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(e.target.value ? Number(e.target.value) : '');
    setPage(1);
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
          
          <select 
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={status}
            onChange={handleStatusChange}
          >
            <option value="">Все статусы</option>
            {Object.entries(statusMap).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <select 
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[200px]"
            value={categoryId}
            onChange={handleCategoryChange}
          >
            <option value="">Все категории</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={5} className="h-24 text-center">Загрузка...</TableCell>
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
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
    </div>
  );
}
