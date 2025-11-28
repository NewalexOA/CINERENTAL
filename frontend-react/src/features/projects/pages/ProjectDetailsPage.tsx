import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../../../services/projects';
import { bookingsService, BookingCreate, BookingUpdate } from '../../../services/bookings';
import { ProjectStatus } from '../../../types/project';
import { Equipment } from '../../../types/equipment';
import { Button } from '../../../components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Calendar } from '../../../components/ui/calendar';
import { Textarea } from '../../../components/ui/textarea';
import { EquipmentPicker } from '../../equipment/components/EquipmentPicker';
import { ArrowLeft, Trash2, Plus, Calendar as CalendarIcon, User, Printer, Minus, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [ProjectStatus.DRAFT]: { label: 'Черновик', variant: 'secondary' },
  [ProjectStatus.ACTIVE]: { label: 'Активен', variant: 'default' },
  [ProjectStatus.COMPLETED]: { label: 'Завершен', variant: 'success' },
  [ProjectStatus.CANCELLED]: { label: 'Отменен', variant: 'destructive' },
};

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = Number(id);

  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.getById(projectId),
    enabled: !!projectId,
    onSuccess: (data) => {
      setNotes(data.description || "");
    }
  });

  // Mutations
  const updateProjectMutation = useMutation({
    mutationFn: (data: { description: string }) => projectsService.update(projectId, { id: projectId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Заметки обновлены');
    }
  });

  const addBookingMutation = useMutation({
    mutationFn: (data: BookingCreate) => bookingsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Оборудование добавлено');
    },
    onError: (err) => {
      toast.error('Ошибка при добавлении оборудования');
      console.error(err);
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId: number) => bookingsService.delete(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Бронирование удалено');
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BookingUpdate }) => bookingsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Бронирование обновлено');
    },
    onError: (err) => {
      toast.error('Ошибка при обновлении бронирования');
      console.error(err);
    }
  });

  const handleAddEquipment = (item: Equipment) => {
    if (!project) return;
    addBookingMutation.mutate({
      project_id: projectId,
      client_id: project.client_id,
      equipment_id: item.id,
      start_date: project.start_date,
      end_date: project.end_date,
      quantity: 1,
      total_amount: 0 // Placeholder
    });
  };
  
  const handleDateUpdate = (bookingId: number, range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      updateBookingMutation.mutate({
        id: bookingId,
        data: {
          start_date: range.from.toISOString(),
          end_date: range.to.toISOString()
        }
      });
    }
  };

  const handleQuantityChange = (bookingId: number, currentQuantity: number, change: 1 | -1) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity > 0) {
      updateBookingMutation.mutate({ id: bookingId, data: { quantity: newQuantity } });
    } else {
      deleteBookingMutation.mutate(bookingId);
    }
  };

  const handleSaveNotes = () => {
    updateProjectMutation.mutate({ description: notes });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка проекта...</div>;
  if (error || !project) return <div className="p-8 text-center text-destructive">Ошибка загрузки проекта</div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Назад к списку
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{project.client?.name || 'Нет клиента'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={() => window.open(`http://localhost:8000/projects/${projectId}/print`, '_blank')}>
               <Printer className="mr-2 h-4 w-4" /> Печать
             </Button>
             <Select 
               value={project.status} 
               onValueChange={(val) => updateProjectMutation.mutate({ status: val as ProjectStatus })}
             >
               <SelectTrigger className="w-[140px]">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {Object.entries(statusMap).map(([key, val]) => (
                   <SelectItem key={key} value={key}>{val.label}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" /> Даты
          </h3>
          <p className="text-sm">
            {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4 shadow-sm md:col-span-2">
          <h3 className="font-semibold mb-2">Заметки</h3>
          <div className="flex flex-col gap-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Добавьте заметки к проекту..." />
            <Button size="sm" onClick={handleSaveNotes} className="self-end">
              <Save className="mr-2 h-4 w-4"/>
              Сохранить заметки
            </Button>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="bg-card border rounded-lg shadow-sm flex-1 flex flex-col min-h-[300px]">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Оборудование ({project.bookings?.length || 0})</h2>
          <Button size="sm" onClick={() => setIsAddEquipmentOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Добавить
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Оборудование</TableHead>
                <TableHead>Штрихкод</TableHead>
                <TableHead>Период</TableHead>
                <TableHead className="w-[120px] text-center">Кол-во</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.bookings?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Нет оборудования</TableCell></TableRow>
              ) : project.bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.equipment?.name || `Item #${booking.equipment_id}`}
                    <div className="text-xs text-muted-foreground">{booking.equipment?.category_name}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {booking.equipment?.barcode}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-[220px] justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(booking.start_date), "dd.MM.yyyy")} - {format(new Date(booking.end_date), "dd.MM.yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="range"
                          selected={{ from: new Date(booking.start_date), to: new Date(booking.end_date) }}
                          onSelect={(range) => handleDateUpdate(booking.id, range)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="text-center">
                    {!booking.equipment?.serial_number ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(booking.id, booking.quantity, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span>{booking.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(booking.id, booking.quantity, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span>{booking.quantity}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBookingMutation.mutate(booking.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Equipment Dialog */}
      <Dialog open={isAddEquipmentOpen} onOpenChange={setIsAddEquipmentOpen}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Добавить оборудование</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-1">
            <EquipmentPicker onAdd={handleAddEquipment} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
