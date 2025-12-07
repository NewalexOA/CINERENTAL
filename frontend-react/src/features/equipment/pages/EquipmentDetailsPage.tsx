import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentService } from '../../../services/equipment';
import { categoriesService } from '../../../services/categories';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, QrCode, Tag, DollarSign, Calendar, Save, Pencil, Trash2, Copy, RotateCw, Printer } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { EquipmentFormDialog } from '../components/EquipmentFormDialog';
import { EquipmentDeleteDialog } from '../components/EquipmentDeleteDialog';
import { BarcodePrintDialog } from '../components/BarcodePrintDialog';
import { EquipmentCreate, EquipmentUpdate } from '../../../types/equipment';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../../components/ui/table';
import { format, parseISO } from 'date-fns';
import { BookingStatus } from '../../../services/bookings';
import { EquipmentStatus } from '../../../types/equipment';

const equipmentStatusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [EquipmentStatus.AVAILABLE]: { label: 'Доступно', variant: 'success' },
  [EquipmentStatus.RENTED]: { label: 'В аренде', variant: 'default' },
  [EquipmentStatus.MAINTENANCE]: { label: 'Обслуживание', variant: 'warning' },
  [EquipmentStatus.BROKEN]: { label: 'Сломано', variant: 'destructive' },
  [EquipmentStatus.RETIRED]: { label: 'Списано', variant: 'secondary' },
};

export default function EquipmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const equipmentId = Number(id);
  const [notes, setNotes] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const { data: equipment, isLoading, error } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: () => equipmentService.getById(equipmentId),
    enabled: !!equipmentId
  });

  const { data: bookings } = useQuery({
    queryKey: ['equipment-bookings', equipmentId],
    queryFn: () => equipmentService.getBookings(equipmentId),
    enabled: !!equipmentId
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll
  });

  // Initialize notes when equipment data loads
  useEffect(() => {
    if (equipment?.notes) {
      setNotes(equipment.notes);
    }
  }, [equipment]);

  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) => equipmentService.updateNotes(equipmentId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      toast.success('Заметки сохранены');
    },
    onError: () => {
      toast.error('Ошибка при сохранении заметок');
    }
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const updateMutation = useMutation({
    mutationFn: (data: EquipmentCreate) => equipmentService.update(equipmentId, { ...data, id: equipmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setIsEditOpen(false);
      toast.success('Оборудование обновлено');
    },
    onError: () => {
      toast.error('Ошибка при обновлении оборудования');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => equipmentService.delete(equipmentId),
    onSuccess: () => {
      toast.success('Оборудование удалено');
      navigate('/equipment');
    },
    onError: () => {
      toast.error('Ошибка при удалении (возможно есть активные бронирования)');
    }
  });

  const handleUpdate = async (data: EquipmentCreate) => {
    await updateMutation.mutateAsync(data);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  const regenerateBarcodeMutation = useMutation({
    mutationFn: () => equipmentService.regenerateBarcode(equipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      toast.success('Штрихкод регенерирован');
    },
    onError: () => {
      toast.error('Ошибка при регенерации штрихкода');
    }
  });

  const handleCopyBarcode = async () => {
    if (equipment?.barcode) {
      try {
        await navigator.clipboard.writeText(equipment.barcode);
        toast.success('Штрихкод скопирован в буфер обмена');
      } catch (err) {
        toast.error('Ошибка при копировании штрихкода');
      }
    }
  };

  const handleRegenerateBarcode = () => {
    if (confirm('Вы уверены, что хотите регенерировать штрихкод? Старый штрихкод будет потерян.')) {
      regenerateBarcodeMutation.mutate();
    }
  };

  const handlePrintBarcode = () => {
    setIsPrintOpen(true);
  };

  const bookingStatusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
    [BookingStatus.PENDING]: { label: 'Ожидание', variant: 'secondary' },
    [BookingStatus.CONFIRMED]: { label: 'Подтверждено', variant: 'default' },
    [BookingStatus.ACTIVE]: { label: 'Активно', variant: 'success' },
    [BookingStatus.COMPLETED]: { label: 'Завершено', variant: 'outline' },
    [BookingStatus.CANCELLED]: { label: 'Отменено', variant: 'destructive' },
    [BookingStatus.OVERDUE]: { label: 'Просрочено', variant: 'warning' }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;
  if (error || !equipment) return <div className="p-8 text-center text-destructive">Оборудование не найдено</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground h-6 text-xs" onClick={() => navigate('/equipment')}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Назад к списку
        </Button>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{equipment.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={equipmentStatusMap[equipment.status]?.variant || 'outline'}>
              {equipmentStatusMap[equipment.status]?.label || equipment.status}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditOpen(true)}>
              <Pencil className="mr-1 h-3 w-3" /> Редактировать
            </Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="mr-1 h-3 w-3" /> Удалить
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-md p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Категория</span>
            <span className="font-medium flex items-center gap-1">
              <Tag className="h-3 w-3" /> {equipment.category_name || '-'}
            </span>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Штрихкод</span>
            <div className="flex items-center gap-2">
              <span className="font-mono flex items-center gap-1">
                <QrCode className="h-3 w-3" /> {equipment.barcode}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyBarcode}
                  title="Копировать штрихкод"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRegenerateBarcode}
                  disabled={regenerateBarcodeMutation.isPending}
                  title="Регенерировать штрихкод"
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handlePrintBarcode}
                  title="Печать штрихкода"
                >
                  <Printer className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          {equipment.serial_number && (
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Серийный номер</span>
              <span className="font-mono">{equipment.serial_number}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Стоимость замены</span>
            <span className="font-medium flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> {equipment.replacement_cost} ₽
            </span>
          </div>
          {equipment.description && (
            <div className="pt-2">
              <h4 className="text-xs uppercase text-muted-foreground font-semibold mb-1">Описание</h4>
              <p className="text-sm">{equipment.description}</p>
            </div>
          )}
        </div>

        {/* Booking History */}
        <div className="bg-card border rounded-md shadow-sm flex flex-col">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">История бронирований</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            {bookings && bookings.length > 0 ? (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="h-8 py-0">Проект</TableHead>
                    <TableHead className="h-8 py-0">Клиент</TableHead>
                    <TableHead className="h-8 py-0">Даты</TableHead>
                    <TableHead className="h-8 py-0">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} className="h-8 hover:bg-muted/50">
                      <TableCell className="py-1 font-medium">
                        {booking.project_name ? (
                          <Link to={`/projects/${booking.project_id}`} className="hover:underline text-foreground hover:text-primary transition-colors">
                            {booking.project_name}
                          </Link>
                        ) : (
                          `Проект #${booking.project_id}`
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <Link to={`/clients/${booking.client_id}`} className="hover:underline text-muted-foreground hover:text-primary transition-colors text-[10px]">
                          {booking.client_name}
                        </Link>
                      </TableCell>
                      <TableCell className="py-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(booking.start_date), 'dd.MM.yy')} - {format(parseISO(booking.end_date), 'dd.MM.yy')}
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <Badge variant={bookingStatusMap[booking.booking_status]?.variant || 'outline'} className="text-[10px] h-4 px-1 w-fit">
                          {bookingStatusMap[booking.booking_status]?.label || booking.booking_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Нет истории бронирований
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-card border rounded-md shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Заметки</h3>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleSaveNotes}
            disabled={updateNotesMutation.isPending}
          >
            <Save className="mr-1 h-3 w-3" />
            {updateNotesMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Добавьте заметки об оборудовании..."
          className="min-h-[120px] text-sm"
        />
      </div>

      {/* Dialogs */}
      <EquipmentFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        equipment={equipment}
        categories={categories || []}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <EquipmentDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <BarcodePrintDialog
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
        barcode={equipment?.barcode || ''}
        serialNumber={equipment?.serial_number}
      />
    </div>
  );
}
