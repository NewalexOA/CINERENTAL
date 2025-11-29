import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientsService } from '@/services/clients';
import { bookingsService } from '@/services/bookings';
import { projectsService } from '@/services/projects';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = Number(id);

  const { data: client, isLoading, error } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsService.getById(clientId),
    enabled: !!clientId
  });

  // Fetch client's projects
  const { data: projects } = useQuery({
    queryKey: ['client-projects', clientId],
    queryFn: () => projectsService.getPaginated({ client_id: clientId, size: 100 }), // Fetch recent projects
    enabled: !!clientId
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;
  if (error || !client) return <div className="p-8 text-center text-destructive">Клиент не найден</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground h-6 text-xs" onClick={() => navigate('/clients')}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Назад к списку
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-card border rounded-md p-4 shadow-sm h-fit">
          <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground">Контактная информация</h3>
          <div className="space-y-3 text-sm">
            {client.company && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{client.company}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
              </div>
            )}
            {/* Address placeholder if needed */}
            <div className="pt-2 border-t mt-2 flex justify-between items-center text-xs text-muted-foreground">
              <span>ID: {client.id}</span>
              <span>Создан: {client.created_at ? format(parseISO(client.created_at), 'dd.MM.yyyy') : '-'}</span>
            </div>
          </div>
        </div>

        {/* Stats / Activity */}
        <div className="md:col-span-2">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList>
              <TabsTrigger value="projects">Проекты</TabsTrigger>
              <TabsTrigger value="bookings">История бронирований</TabsTrigger>
            </TabsList>
            <TabsContent value="projects" className="border rounded-md mt-2 p-0 overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Даты</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects?.items.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        {format(parseISO(project.start_date), 'dd.MM.yyyy')} - {format(parseISO(project.end_date), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!projects?.items || projects.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">Нет проектов</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="bookings">
              <div className="p-4 text-center text-muted-foreground text-sm border rounded-md mt-2">
                История бронирований доступна в разделе "Бронирования" с фильтром по клиенту.
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/bookings?client_id=${clientId}`)}>
                    Перейти к бронированиям
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
