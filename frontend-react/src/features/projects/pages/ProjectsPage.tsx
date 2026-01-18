import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../../services/projects';
import { Project, ProjectStatus, ProjectPaymentStatus } from '../../../types/project';
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
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../../../components/ui/collapsible';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  Calendar,
  ChevronDown,
  User
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { PaginationControls } from '../../../components/ui/pagination-controls';
import { format, parseISO } from 'date-fns';
import { cn } from '../../../lib/utils';

type ViewMode = 'table' | 'card';

const VIEW_STORAGE_KEY = 'projectsViewMode';

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [ProjectStatus.DRAFT]: { label: 'Черновик', variant: 'secondary' },
  [ProjectStatus.ACTIVE]: { label: 'Активен', variant: 'default' },
  [ProjectStatus.COMPLETED]: { label: 'Завершен', variant: 'success' },
  [ProjectStatus.CANCELLED]: { label: 'Отменен', variant: 'destructive' },
};

const paymentStatusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [ProjectPaymentStatus.UNPAID]: { label: 'Не оплачен', variant: 'destructive' },
  [ProjectPaymentStatus.PARTIALLY_PAID]: { label: 'Частично', variant: 'warning' },
  [ProjectPaymentStatus.PAID]: { label: 'Оплачен', variant: 'success' },
};

const statusOrder = [
  ProjectStatus.DRAFT,
  ProjectStatus.ACTIVE,
  ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED
];

interface ProjectCardProps {
  project: Project;
  onNavigate: (id: number) => void;
}

function ProjectCard({ project, onNavigate }: ProjectCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow h-full"
      onClick={() => onNavigate(project.id)}
    >
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2">{project.name}</CardTitle>
          <Badge
            variant={statusMap[project.status]?.variant || 'outline'}
            className="px-1.5 py-0 text-[10px] h-5 shrink-0"
          >
            {statusMap[project.status]?.label || project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        {project.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{project.description}</p>
        )}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{project.client_name || '-'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(parseISO(project.start_date), "dd.MM.yyyy")} - {format(parseISO(project.end_date), "dd.MM.yyyy")}
            </span>
          </div>
          {project.payment_status && (
            <Badge
              variant={paymentStatusMap[project.payment_status]?.variant || 'outline'}
              className="px-1.5 py-0 text-[10px] h-5 shrink-0"
            >
              {paymentStatusMap[project.payment_status]?.label || project.payment_status}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusGroupProps {
  status: ProjectStatus;
  projects: Project[];
  onNavigate: (id: number) => void;
  defaultOpen?: boolean;
}

function StatusGroup({ status, projects, onNavigate, defaultOpen = true }: StatusGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (projects.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-8 px-2 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={statusMap[status]?.variant || 'outline'}
              className="px-1.5 py-0 text-[10px] h-5"
            >
              {statusMap[status]?.label || status}
            </Badge>
            <span className="text-xs text-muted-foreground">({projects.length})</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<ProjectPaymentStatus | ''>('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return (saved === 'card' || saved === 'table') ? saved : 'table';
  });

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', page, size, search, status, paymentStatus],
    queryFn: () => projectsService.getPaginated({
      page,
      size,
      query: search || undefined,
      project_status: status || undefined,
      payment_status: paymentStatus || undefined,
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

  const handleNavigate = (id: number) => {
    navigate(`/projects/${id}`);
  };

  // Group projects by status for card view
  const groupedProjects = useMemo(() => {
    if (!data?.items) return {};
    return statusOrder.reduce((acc, statusKey) => {
      acc[statusKey] = data.items
        .filter((p) => p.status === statusKey)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      return acc;
    }, {} as Record<ProjectStatus, Project[]>);
  }, [data?.items]);

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

          <Select
            value={paymentStatus || "all"}
            onValueChange={(val) => { setPaymentStatus(val === 'all' ? '' : val as ProjectPaymentStatus); setPage(1); }}
          >
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue placeholder="Вся оплата" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Вся оплата</SelectItem>
              {Object.entries(paymentStatusMap).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={() => setViewMode('table')}
              title="Таблица"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 rounded-l-none border-l"
              onClick={() => setViewMode('card')}
              title="Карточки"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Button size="sm" className="h-7 text-xs" onClick={() => navigate('/projects/new')}>
          <Plus className="mr-1 h-3 w-3" /> Новый проект
        </Button>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
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
                    <div className="flex gap-1">
                      <Badge variant={statusMap[item.status]?.variant || 'outline'} className="px-1.5 py-0 text-[10px] h-5">
                        {statusMap[item.status]?.label || item.status}
                      </Badge>
                      {item.payment_status && (
                        <Badge variant={paymentStatusMap[item.payment_status]?.variant || 'outline'} className="px-1.5 py-0 text-[10px] h-5">
                          {paymentStatusMap[item.payment_status]?.label || item.payment_status}
                        </Badge>
                      )}
                    </div>
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
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="flex-1 overflow-auto space-y-2 px-1">
          {isLoading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              Загрузка...
            </div>
          ) : data?.items.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              Проекты не найдены
            </div>
          ) : (
            statusOrder.map((statusKey) => (
              <StatusGroup
                key={statusKey}
                status={statusKey}
                projects={groupedProjects[statusKey] || []}
                onNavigate={handleNavigate}
                defaultOpen={statusKey === ProjectStatus.DRAFT || statusKey === ProjectStatus.ACTIVE}
              />
            ))
          )}
        </div>
      )}

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
