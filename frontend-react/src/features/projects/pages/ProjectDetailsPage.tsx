import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../../../services/projects';
import { clientsService } from '../../../services/clients';
import { bookingsService, BookingCreate, BookingUpdate } from '../../../services/bookings';
import { ProjectStatus, ProjectCreate, ProjectPaymentStatus } from '../../../types/project';
import { PaymentStatusChanger } from '../components/PaymentStatusChanger';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { EquipmentPicker } from '../../equipment/components/EquipmentPicker';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeft, Trash2, Plus, Calendar as CalendarIcon, User, Printer, Minus, Save, Edit, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { DateTimeRangePicker } from '../../../components/ui/date-range-picker';

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

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = Number(id);

  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    client_id: '',
    start_date: '',
    end_date: '',
    description: ''
  });

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.getById(projectId),
    enabled: !!projectId,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsService.getAll,
    enabled: isEditProjectOpen
  });

  // Sync state when project loads
  useEffect(() => {
    if (project) {
      setNotes(project.notes || "");
      setEditForm({
        name: project.name,
        client_id: String(project.client_id),
        start_date: project.start_date,
        end_date: project.end_date,
        description: project.description || ''
      });
    }
  }, [project]);

  // Mutations
  const updateProjectMutation = useMutation({
    mutationFn: (data: Partial<ProjectCreate>) => projectsService.update(projectId, { id: projectId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Проект обновлен');
      setIsEditProjectOpen(false);
    },
    onError: (err) => {
      toast.error('Ошибка при обновлении проекта');
      console.error(err);
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectsService.delete(projectId),
    onSuccess: () => {
      toast.success('Проект удален');
      navigate('/projects');
    },
    onError: (err) => {
      toast.error('Ошибка при удалении проекта');
      console.error(err);
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
    },
    onError: (err) => {
      toast.error('Ошибка при обновлении бронирования');
      console.error(err);
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
      if (confirm('Удалить эту позицию?')) {
        deleteBookingMutation.mutate(bookingId);
      }
    }
  };

  const handleSaveNotes = () => {
    updateProjectMutation.mutate({ notes: notes });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectMutation.mutate({
      name: editForm.name,
      client_id: Number(editForm.client_id),
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      description: editForm.description
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка проекта...</div>;
  if (error || !project) return <div className="p-8 text-center text-destructive">Ошибка загрузки проекта</div>;

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-2 shrink-0">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground h-6 text-xs" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Назад к списку
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.payment_status && (
                <Badge
                  variant={paymentStatusMap[project.payment_status]?.variant || 'outline'}
                  className="text-xs"
                >
                  {paymentStatusMap[project.payment_status]?.label || project.payment_status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
              <User className="h-3 w-3" />
              <span className="font-medium">
                {project.client ? (
                  <Link to={`/clients/${project.client_id}`} className="hover:underline text-foreground hover:text-primary transition-colors">
                    {project.client.name}
                  </Link>
                ) : 'Нет клиента'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditProjectOpen(true)}>
               <Edit className="mr-1 h-3 w-3" /> Редактировать
             </Button>
             <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`http://localhost:8000/projects/${projectId}/print`, '_blank')}>
               <Printer className="mr-1 h-3 w-3" /> Печать
             </Button>
             <Select
               value={project.status}
               onValueChange={(val) => updateProjectMutation.mutate({ status: val as ProjectStatus })}
             >
               <SelectTrigger className="w-[130px] h-7 text-xs">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {Object.entries(statusMap).map(([key, val]) => (
                   <SelectItem key={key} value={key}>{val.label}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
             <Button variant="destructive" size="icon" className="ml-2 h-7 w-7" onClick={() => setIsDeleteDialogOpen(true)}>
               <Trash2 className="h-3 w-3" />
             </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        {/* Info Card */}
        <div className="bg-card border rounded-md p-3 shadow-sm">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <CalendarIcon className="h-3 w-3 text-primary" /> Даты проекта
          </h3>
          <p className="text-sm font-medium">
            {format(parseISO(project.start_date), 'dd.MM.yyyy HH:mm')} - {format(parseISO(project.end_date), 'dd.MM.yyyy HH:mm')}
          </p>
          {project.description && (
            <div className="mt-2">
              <h4 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Описание</h4>
              <p className="text-xs">{project.description}</p>
            </div>
          )}
        </div>

        {/* Payment Status Card */}
        {project.payment_status && (
          <PaymentStatusChanger
            projectId={projectId}
            currentStatus={project.payment_status}
          />
        )}

        {/* Notes Card */}
        <div className="bg-card border rounded-md p-3 shadow-sm md:col-span-2 flex flex-col">
          <h3 className="font-semibold mb-2 text-sm">Заметки</h3>
          <div className="flex flex-col gap-2 flex-1">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Добавьте заметки к проекту..."
              className="resize-none flex-1 min-h-[60px] text-xs"
            />
            <Button size="sm" variant="secondary" onClick={handleSaveNotes} className="self-end h-6 text-xs" disabled={notes === project.notes}>
              <Save className="mr-1 h-3 w-3"/>
              Сохранить заметки
            </Button>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="bg-card border rounded-md shadow-sm flex-1 flex flex-col min-h-[300px] overflow-hidden">
        <div className="p-2 border-b flex justify-between items-center shrink-0 bg-muted/20">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Оборудование
            <span className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full text-[10px]">
              {project.bookings?.length || 0}
            </span>
          </h2>
          <Button size="sm" className="h-6 text-xs" onClick={() => setIsAddEquipmentOpen(true)}>
            <Plus className="mr-1 h-3 w-3" /> Добавить
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="h-8 py-0">Оборудование</TableHead>
                <TableHead className="h-8 py-0">Категория</TableHead>
                <TableHead className="h-8 py-0 w-[240px]">Период</TableHead>
                <TableHead className="h-8 py-0 w-[100px] text-center">Кол-во</TableHead>
                <TableHead className="h-8 py-0 w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.bookings?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Нет оборудования</TableCell></TableRow>
              ) : project.bookings?.map((booking) => {
                const isDifferentDates =
                  !isSameDay(parseISO(booking.start_date), parseISO(project.start_date)) ||
                  !isSameDay(parseISO(booking.end_date), parseISO(project.end_date));

                return (
                  <TableRow key={booking.id} className="h-8">
                    <TableCell className="py-1 font-medium">
                      <div className="flex flex-col">
                        <Link to={`/equipment/${booking.equipment_id}`} className="hover:underline text-foreground hover:text-primary transition-colors">
                          {booking.equipment_name || `Item #${booking.equipment_id}`}
                        </Link>
                        <span className="text-[10px] text-muted-foreground font-mono">{booking.barcode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1 text-muted-foreground text-[10px]">
                      {booking.category_name || '-'}
                    </TableCell>
                    <TableCell className="py-1">
                      <DateTimeRangePicker
                        date={{
                          from: parseISO(booking.start_date),
                          to: parseISO(booking.end_date)
                        }}
                        setDate={(range) => handleDateUpdate(booking.id, range)}
                        className={`h-7 ${isDifferentDates ? 'text-amber-600 font-medium' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      {!booking.serial_number ? (
                        <div className="flex items-center justify-center gap-1 border rounded-md p-0.5 w-fit mx-auto">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleQuantityChange(booking.id, booking.quantity, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-[10px]">{booking.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleQuantityChange(booking.id, booking.quantity, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px]">{booking.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                        if (confirm('Удалить эту позицию?')) deleteBookingMutation.mutate(booking.id);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Equipment Dialog */}
      <Dialog open={isAddEquipmentOpen} onOpenChange={setIsAddEquipmentOpen}>
        <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-3 pb-2 border-b">
            <DialogTitle className="text-base">Добавить оборудование в проект</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-2">
            <EquipmentPicker onAdd={handleAddEquipment} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Редактировать проект</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Название проекта</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client">Клиент</Label>
              <Select
                value={editForm.client_id}
                onValueChange={(val) => setEditForm({...editForm, client_id: val})}
              >
                <SelectTrigger id="edit-client">
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Период проекта</Label>
              <DateTimeRangePicker
                date={{
                  from: editForm.start_date ? parseISO(editForm.start_date) : undefined,
                  to: editForm.end_date ? parseISO(editForm.end_date) : undefined
                }}
                setDate={(range) => {
                  setEditForm({
                    ...editForm,
                    start_date: range?.from ? range.from.toISOString() : editForm.start_date,
                    end_date: range?.to ? range.to.toISOString() : editForm.end_date
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc">Описание</Label>
              <Textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditProjectOpen(false)}>Отмена</Button>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Удалить проект?
            </DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить проект "{project.name}"? Это действие необратимо и приведет к удалению всех связанных бронирований.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={() => deleteProjectMutation.mutate()}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
