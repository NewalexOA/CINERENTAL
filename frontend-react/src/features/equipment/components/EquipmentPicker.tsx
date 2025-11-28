import { useQuery } from '@tanstack/react-query';
import { equipmentService } from '../../../services/equipment';
import { categoriesService } from '../../../services/categories';
import { EquipmentStatus, Equipment } from '../../../types/equipment';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
import { Search, QrCode, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { flattenCategories } from '../../../utils/category-utils';

interface EquipmentPickerProps {
  onAdd: (equipment: Equipment) => void;
}

export function EquipmentPicker({ onAdd }: EquipmentPickerProps) {
  const [page, setPage] = useState(1);
  const [size] = useState(10); // Smaller page size for picker
  const [search, setSearch] = useState('');
  const [status] = useState<EquipmentStatus | ''>(EquipmentStatus.AVAILABLE); // Default to available, read-only here
  const [categoryId, setCategoryId] = useState<number | ''>('');

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); 
  };

  if (error) return <div className="p-4 text-center text-destructive">Ошибка загрузки</div>;

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Поиск..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        
        <Select 
          value={categoryId ? String(categoryId) : "all"} 
          onValueChange={(val) => { setCategoryId(val === 'all' ? '' : Number(val)); setPage(1); }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Категория" />
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Код</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={4} className="h-24 text-center">Загрузка...</TableCell></TableRow>
            ) : data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.category_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-1 text-xs">
                      <QrCode className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{item.barcode}</span>
                   </div>
                </TableCell>
                <TableCell>{item.replacement_cost} ₽</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => onAdd(item)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow><TableCell colSpan={4} className="h-24 text-center">Нет данных</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Simplified Pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
        >
          Назад
        </Button>
        <span className="text-xs text-muted-foreground">Стр. {page}</span>
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
  );
}
