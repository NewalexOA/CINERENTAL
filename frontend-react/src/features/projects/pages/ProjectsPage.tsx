import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../../services/projects';
import { clientsService } from '../../../services/clients';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../components/ui/command';
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
  ChevronsUpDown,
  Check,
  User,
  Loader2
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { PaginationControls } from '../../../components/ui/pagination-controls';
import { format, parseISO } from 'date-fns';
import { cn } from '../../../lib/utils';
import { useDebounce } from '../../../hooks/useDebounce';
import { useUrlState } from '../../../hooks/useUrlState';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

type ViewMode = 'table' | 'card';

const VIEW_STORAGE_KEY = 'projectsViewMode';

const projectsUrlSchema = {
  page:          { type: 'number', default: 1, persist: false },
  size:          { type: 'number', default: 20 },
  search:        { type: 'string', default: '' },
  status:        { type: 'string', default: '' },
  paymentStatus: { type: 'string', default: '' },
  clientId:      { type: 'number', default: null },
  clientName:    { type: 'string', default: null },
} as const;

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  [ProjectStatus.DRAFT]: { label: 'Черновик', variant: 'secondary' },
  [ProjectStatus.ACTIVE]: { label: 'Активен', variant: 'success' },
  [ProjectStatus.COMPLETED]: { label: 'Завершен', variant: 'info' },
  [ProjectStatus.CANCELLED]: { label: 'Отменен', variant: 'secondary' },
};

const paymentStatusMap: Record<string, { label: string, color: string }> = {
  [ProjectPaymentStatus.UNPAID]: { label: 'Не оплачен', color: 'bg-red-600' },
  [ProjectPaymentStatus.PARTIALLY_PAID]: { label: 'Частично оплачен', color: 'bg-amber-400' },
  [ProjectPaymentStatus.PAID]: { label: 'Оплачен', color: 'bg-green-500' },
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
            className="px-1.5 py-0 text-[10px] h-5 shrink-0 min-w-[70px] justify-center"
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
          {project.payment_status && paymentStatusMap[project.payment_status] && (
            <span
              className={cn("h-3 w-3 rounded-full shrink-0", paymentStatusMap[project.payment_status].color)}
              title={paymentStatusMap[project.payment_status].label}
            />
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
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusGroup({ status, projects, onNavigate, isOpen, onOpenChange }: StatusGroupProps) {
  if (projects.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="space-y-2">
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
  const { values: urlState, setParams } = useUrlState(projectsUrlSchema, {
    storageKey: 'projects-filters',
  });
  const { page, size, status, paymentStatus, clientId, clientName: selectedClientName } = urlState;

  const [searchInput, setSearchInput] = useState(urlState.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const lastCommittedSearch = useRef(urlState.search);

  // Effect 1: Debounced input → URL
  useEffect(() => {
    if (debouncedSearch !== lastCommittedSearch.current) {
      lastCommittedSearch.current = debouncedSearch;
      setParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, setParams]);

  // Effect 2: URL → local input (browser back/forward only)
  useEffect(() => {
    if (urlState.search !== lastCommittedSearch.current) {
      lastCommittedSearch.current = urlState.search;
      setSearchInput(urlState.search);
    }
  }, [urlState.search]);

  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return (saved === 'card' || saved === 'table') ? saved : 'table';
  });
  const [groupExpanded, setGroupExpanded] = useLocalStorage<Record<string, boolean>>(
    'projects-card-groups',
    { DRAFT: true, ACTIVE: true, COMPLETED: false, CANCELLED: false }
  );

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Fetch clients for filter dropdown with server-side search
  const { data: clients, isFetching: isFetchingClients, isError: isClientsError } = useQuery({
    queryKey: ['clients-search', debouncedClientSearch],
    queryFn: () => clientsService.search({ query: debouncedClientSearch, limit: 20 }),
    placeholderData: keepPreviousData, // Keep previous results while fetching new ones
    enabled: clientPopoverOpen, // Only fetch when popover is open
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', page, size, urlState.search, status, paymentStatus, clientId],
    queryFn: () => projectsService.getPaginated({
      page,
      size,
      query: urlState.search || undefined,
      project_status: status || undefined,
      payment_status: paymentStatus || undefined,
      client_id: clientId || undefined,
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
  const groupedProjects = useMemo((): Record<ProjectStatus, Project[]> => {
    if (!data?.items) return {} as Record<ProjectStatus, Project[]>;
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <Popover open={clientPopoverOpen} onOpenChange={(open) => {
            setClientPopoverOpen(open);
            if (!open) setClientSearch('');
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clientPopoverOpen}
                className="w-[160px] h-7 text-xs justify-between font-normal"
              >
                <span className="truncate">
                  {clientId ? selectedClientName || 'Загрузка...' : 'Все клиенты'}
                </span>
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command shouldFilter={false}>
                <div className="relative">
                  <CommandInput
                    placeholder="Поиск клиента..."
                    className="h-8 text-xs"
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  {isFetchingClients && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CommandList className="min-h-[120px] max-h-[200px]">
                  {isClientsError && (
                    <CommandEmpty className="py-6 text-xs text-center text-destructive">
                      Ошибка загрузки клиентов
                    </CommandEmpty>
                  )}
                  {!isFetchingClients && !isClientsError && clients?.length === 0 && clientSearch && (
                    <CommandEmpty className="py-6 text-xs text-center">
                      Клиент не найден
                    </CommandEmpty>
                  )}
                  <CommandGroup>
                    {!clientSearch && (
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setParams({ clientId: null, clientName: null, page: 1 });
                          setClientPopoverOpen(false);
                          setClientSearch('');
                        }}
                        className="text-xs"
                      >
                        <Check className={cn("mr-2 h-3 w-3", clientId === null ? "opacity-100" : "opacity-0")} />
                        Все клиенты
                      </CommandItem>
                    )}
                    {clients?.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setParams({ clientId: client.id, clientName: client.name, page: 1 });
                          setClientPopoverOpen(false);
                          setClientSearch('');
                        }}
                        className="text-xs"
                      >
                        <Check className={cn("mr-2 h-3 w-3", clientId === client.id ? "opacity-100" : "opacity-0")} />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Select
            value={status || "all"}
            onValueChange={(val) => { setParams({ status: val === 'all' ? '' : val, page: 1 }); }}
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
            onValueChange={(val) => { setParams({ paymentStatus: val === 'all' ? '' : val, page: 1 }); }}
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
                      <Badge variant={statusMap[item.status]?.variant || 'outline'} className="px-1.5 py-0 text-[10px] h-5 min-w-[70px] justify-center">
                        {statusMap[item.status]?.label || item.status}
                      </Badge>
                      {item.payment_status && paymentStatusMap[item.payment_status] && (
                        <span
                          className={cn("h-3 w-3 rounded-full", paymentStatusMap[item.payment_status].color)}
                          title={paymentStatusMap[item.payment_status].label}
                        />
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
                isOpen={groupExpanded[statusKey] ?? true}
                onOpenChange={(open) => setGroupExpanded(prev => ({ ...prev, [statusKey]: open }))}
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
        onPageChange={(p) => setParams({ page: p })}
        onPageSizeChange={(s) => setParams({ size: s, page: 1 })}
        disabled={isLoading}
      />
    </div>
  );
}
