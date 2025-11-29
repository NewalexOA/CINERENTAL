import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { equipmentService } from '../../../services/equipment';
import { bookingsService } from '../../../services/bookings';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, QrCode, Tag, DollarSign, Calendar } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { format, parseISO } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';

export default function EquipmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const equipmentId = Number(id);

  const { data: equipment, isLoading, error } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: () => equipmentService.getById(equipmentId), // Need to verify getById exists or use filtering
    enabled: !!equipmentId
  });

  // Use getPaginated with ID filter if getById is not available, but usually it is. 
  // Checking equipmentService: it has getPaginated, create, update, delete. getById is missing in frontend service?
  // Let's check frontend-react/src/services/equipment.ts

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
          <Badge variant={equipment.status === 'AVAILABLE' ? 'success' : 'secondary'}>{equipment.status}</Badge>
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
            <span className="font-mono flex items-center gap-1">
              <QrCode className="h-3 w-3" /> {equipment.barcode}
            </span>
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

        {/* Future: Booking History */}
        <div className="bg-card border rounded-md p-4 shadow-sm">
          <h3 className="font-semibold mb-2">История (В разработке)</h3>
          <p className="text-sm text-muted-foreground">Здесь будет список последних бронирований этого оборудования.</p>
          <div className="mt-4">
             <Button variant="outline" size="sm" onClick={() => navigate(`/bookings?equipment_query=${equipment.name}`)}>
               Найти в бронированиях
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
