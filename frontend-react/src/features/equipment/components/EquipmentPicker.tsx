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
import { Input } from '../../../components/ui/input';
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
import { PaginationControls } from '../../../components/ui/pagination-controls';

interface EquipmentPickerProps {
  onAdd: (equipment: Equipment) => void;
}

export function EquipmentPicker({ onAdd }: EquipmentPickerProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status] = useState<EquipmentStatus | ''>(EquipmentStatus.AVAILABLE);
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
    <div className="flex flex-col h-full space-y-2">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            className="h-7 pl-7 text-xs"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        
        <Select 
          value={categoryId ? String(categoryId) : "all"} 
          onValueChange={(val) => { setCategoryId(val === 'all' ? '' : Number(val)); setPage(1); }}
        >
          <SelectTrigger className="w-full h-7 text-xs">
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

      <div className="border rounded-md flex-1 overflow-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 py-0">Название</TableHead>
              <TableHead className="h-8 py-0">Код</TableHead>
              <TableHead className="h-8 py-0">Цена</TableHead>
              <TableHead className="h-8 py-0 w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={4} className="h-24 text-center">Загрузка...</TableCell></TableRow>
            ) : data?.items.map((item) => (
              <TableRow key={item.id} className="h-8">
                <TableCell className="py-1 font-medium">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[200px]">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.category_name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-1">
                   <div className="flex items-center gap-1 text-[10px]">
                      <QrCode className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{item.barcode}</span>
                   </div>
                </TableCell>
                <TableCell className="py-1">{item.replacement_cost} ₽</TableCell>
                <TableCell className="py-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onAdd(item)}>
                    <Plus className="h-3 w-3" />
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

      <PaginationControls 
        currentPage={page}
        totalPages={data?.pages || 1}
        pageSize={size}
        totalItems={data?.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setSize}
        disabled={isLoading}
      />
    </div>
  );
}
