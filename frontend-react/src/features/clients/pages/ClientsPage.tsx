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

type ViewMode = 'list' | 'grid';
type SortOption = 'name' | 'created_at' | 'bookings_count';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  
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

  // Handlers
  const handleCreate = async (data: ClientCreate) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: ClientCreate) => {
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, data: { ...data, id: editingClient.id } });
    }
  };

  const handleDelete = async () => {
    if (deletingClient) {
      await deleteMutation.mutateAsync(deletingClient.id);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка клиентов...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Ошибка загрузки данных</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header & Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Клиенты</h1>
            <p className="text-muted-foreground">Управление клиентами и контактной информацией</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Добавить клиента
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
          <div className="flex flex-1 items-center gap-2 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Поиск клиентов..."
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-[200px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="name">По имени</option>
              <option value="created_at">По дате регистрации</option>
              <option value="bookings_count">По количеству бронирований</option>
            </select>
          </div>

          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 hover:bg-accent ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              title="Сетка"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <div className="w-[1px] bg-border h-9"></div>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 hover:bg-accent ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
              title="Список"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {filteredAndSortedClients?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-20" />
            <p>Клиенты не найдены</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Компания</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Бронирований</TableHead>
                  <TableHead>Добавлен</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedClients?.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => console.log('View client', client.id)}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.company || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {client.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground"/> {client.email}</div>}
                        {client.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground"/> {client.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {client.bookings_count || 0} бронирований
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingClient(client)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingClient(client)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedClients?.map((client) => (
              <div key={client.id} className="bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors flex flex-col h-full shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{client.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{client.company || 'Нет компании'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2" onClick={() => setEditingClient(client)}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 flex-1 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 opacity-70" />
                    <span className="truncate">{client.email || 'Нет email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 opacity-70" />
                    <span>{client.phone || 'Нет телефона'}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t mt-auto">
                  <Badge variant="outline" className="bg-background">
                    <Box className="h-3 w-3 mr-1" />
                    {client.bookings_count || 0}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : '-'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                   <Button variant="outline" size="sm" onClick={() => setEditingClient(client)}>
                     <Pencil className="h-3 w-3 mr-2" /> Изменить
                   </Button>
                   <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingClient(client)}>
                     <Trash2 className="h-3 w-3 mr-2" /> Удалить
                   </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
