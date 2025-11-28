import { useQuery } from '@tanstack/react-query';
import { clientsService } from '@/services/clients';
import { Client, ClientStatus } from '@/types/client';
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
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useState } from 'react';

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [ClientStatus.ACTIVE]: { label: 'Активен', variant: 'success' },
  [ClientStatus.ARCHIVED]: { label: 'Архив', variant: 'secondary' },
  [ClientStatus.BLOCKED]: { label: 'Заблокирован', variant: 'destructive' },
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsService.getAll
  });

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.company?.toLowerCase().includes(search.toLowerCase()) ||
    client.phone?.includes(search)
  );

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка клиентов...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Ошибка загрузки данных</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Поиск клиентов..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Новый клиент
        </Button>
      </div>

      <div className="border rounded-md flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя / Компания</TableHead>
              <TableHead>Контакты</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Заметки</TableHead>
              <TableHead className="w-[100px] text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients?.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{client.name}</span>
                    {client.company && (
                      <span className="text-xs text-muted-foreground">{client.company}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    {client.phone && <span>{client.phone}</span>}
                    {client.email && <span className="text-muted-foreground">{client.email}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[client.status]?.variant || 'outline'}>
                    {statusMap[client.status]?.label || client.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground" title={client.notes}>
                  {client.notes}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredClients?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
