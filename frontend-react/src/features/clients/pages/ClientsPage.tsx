import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsService } from '../../../services/clients';
import { Client, ClientCreate, ClientUpdate } from '../../../types/client';
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
import { ClientFormDialog } from '../components/ClientFormDialog';
import { ClientDeleteDialog } from '../components/ClientDeleteDialog';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  LayoutGrid,
  List as ListIcon,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Box
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginationControls } from '../../../components/ui/pagination-controls';

type ViewMode = 'list' | 'grid';
type SortOption = 'name' | 'created_at' | 'bookings_count';

export default function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // Queries
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsService.getAll
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ClientCreate) => clientsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsCreateOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClientUpdate }) => clientsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingClient(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeletingClient(null);
    }
  });

  // Filtering and Sorting logic (Client-side)
  const filteredAndSortedClients = clients
    ?.filter(client => {
      const searchLower = search.toLowerCase();
      return (
        client.name.toLowerCase().includes(searchLower) ||
        (client.company && client.company.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.includes(searchLower)) ||
        (client.email && client.email.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created_at':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'bookings_count':
          return (b.bookings_count || 0) - (a.bookings_count || 0);
        default:
          return 0;
      }
    });

  // Pagination logic
  const totalItems = filteredAndSortedClients?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedClients = filteredAndSortedClients?.slice((page - 1) * pageSize, page * pageSize);

  // Handlers
  const handleCreate = async (data: ClientCreate) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: ClientCreate) => {
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, data });
    }
  };

  const handleDelete = async () => {
    if (deletingClient) {
      await deleteMutation.mutateAsync(deletingClient.id);
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка клиентов...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Ошибка загрузки данных</div>;

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Header & Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Клиенты</h1>
          </div>
          <Button size="sm" className="h-7 text-xs" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-3 w-3" /> Добавить клиента
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between bg-card p-2 rounded-md border shadow-sm">
          <div className="flex flex-1 items-center gap-2 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Поиск клиентов..."
                className="h-7 pl-7 text-xs"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <Select
              value={sortBy}
              onValueChange={(val) => setSortBy(val as SortOption)}
            >
              <SelectTrigger className="w-[160px] h-7 text-xs">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">По имени</SelectItem>
                <SelectItem value="created_at">По дате регистрации</SelectItem>
                <SelectItem value="bookings_count">По количеству бронирований</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center border rounded-md overflow-hidden h-7">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 h-full hover:bg-accent flex items-center justify-center ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              title="Сетка"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <div className="w-[1px] bg-border h-full"></div>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 h-full hover:bg-accent flex items-center justify-center ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              title="Список"
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 bg-card border rounded-md">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Search className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">Клиенты не найдены</p>
          </div>
        ) : viewMode === 'list' ? (
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="h-8 py-0">Клиент</TableHead>
                <TableHead className="h-8 py-0">Компания</TableHead>
                <TableHead className="h-8 py-0">Контакты</TableHead>
                <TableHead className="h-8 py-0">Бронирований</TableHead>
                <TableHead className="h-8 py-0">Добавлен</TableHead>
                <TableHead className="h-8 py-0 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients?.map((client) => (
                <TableRow key={client.id} className="h-8 cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clients/${client.id}`)}>
                  <TableCell className="py-1 font-medium">{client.name}</TableCell>
                  <TableCell className="py-1">{client.company || '-'}</TableCell>
                  <TableCell className="py-1">
                    <div className="flex flex-col text-[10px]">
                      {client.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {client.email}</div>}
                      {client.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/> {client.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="py-1">
                    <Badge variant="secondary" className="font-normal text-[10px] h-5 px-1.5">
                      {client.bookings_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1 text-muted-foreground text-[10px]">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="py-1 text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingClient(client)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeletingClient(client)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {paginatedClients?.map((client) => (
              <div
                key={client.id}
                className="bg-card border rounded-md p-3 hover:border-primary/50 transition-colors flex flex-col h-full shadow-sm cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{client.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{client.company || 'Нет компании'}</p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={() => setEditingClient(client)}>
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 flex-1 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 opacity-70" />
                    <span className="truncate">{client.email || 'Нет email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 opacity-70" />
                    <span>{client.phone || 'Нет телефона'}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t mt-auto">
                  <Badge variant="outline" className="bg-background text-[10px] h-5 px-1.5">
                    <Box className="h-3 w-3 mr-1" />
                    {client.bookings_count || 0}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Dialogs */}
      <ClientFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <ClientFormDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        client={editingClient}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ClientDeleteDialog
        open={!!deletingClient}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
