import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../../services/projects';
import { ProjectStatus } from '../../../types/project';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PaginationControls } from '../../../components/ui/pagination-controls';
import { format, parseISO } from 'date-fns';

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [ProjectStatus.DRAFT]: { label: 'Черновик', variant: 'secondary' },
  [ProjectStatus.ACTIVE]: { label: 'Активен', variant: 'default' },
  [ProjectStatus.COMPLETED]: { label: 'Завершен', variant: 'success' },
  [ProjectStatus.CANCELLED]: { label: 'Отменен', variant: 'destructive' },
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', page, size, search, status],
    queryFn: () => projectsService.getPaginated({
      page,
      size,
      query: search || undefined,
      status: status || undefined,
    })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Проект удален');
    },
    onError: (err) => {
      toast.error('Ошибка при удалении проекта');
      console.error(err);
    }
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); 
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
        await deleteMutation.mutateAsync(id);
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
              placeholder="Поиск проектов..."
              className="h-7 pl-7 text-xs"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          
          <Select 
            value={status || "all"} 
            onValueChange={(val) => { setStatus(val === 'all' ? '' : val as ProjectStatus); setPage(1); }}
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
        </div>

        <Button size="sm" className="h-7 text-xs" onClick={() => navigate('/projects/new')}>
          <Plus className="mr-1 h-3 w-3" /> Новый проект
        </Button>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 py-0">Название</TableHead>
              <TableHead className="h-8 py-0">Клиент</TableHead>
              <TableHead className="h-8 py-0">Даты</TableHead>
              <TableHead className="h-8 py-0">Статус</TableHead>
              <TableHead className="h-8 py-0 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={5} className="h-24 text-center">Загрузка...</TableCell>
               </TableRow>
            ) : data?.items.map((item) => (
              <TableRow 
                key={item.id} 
                className="h-8 cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/projects/${item.id}`)}
              >
                <TableCell className="py-1 font-medium">
                  {item.name}
                  {item.description && <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.description}</div>}
                </TableCell>
                <TableCell className="py-1">
                  {item.client_name || '-'}
                </TableCell>
                <TableCell className="py-1">
                   <div className="text-[10px] whitespace-nowrap">
                    {format(parseISO(item.start_date), "dd.MM.yyyy")} - {format(parseISO(item.end_date), "dd.MM.yyyy")}
                  </div>
                </TableCell>
                <TableCell className="py-1">
                  <Badge variant={statusMap[item.status]?.variant || 'outline'} className="px-1.5 py-0 text-[10px] h-5">
                    {statusMap[item.status]?.label || item.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-1 text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/projects/${item.id}`)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => handleDelete(e, item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Проекты не найдены
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
    </div>
  );
}
