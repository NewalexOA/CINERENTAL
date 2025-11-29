import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingsService, BookingStatus, PaymentStatus } from '../../../services/bookings';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DateTimeRangePicker } from '../../../components/ui/date-range-picker';

const bookingStatusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [BookingStatus.PENDING]: { label: 'Ожидает', variant: 'secondary' },
  [BookingStatus.CONFIRMED]: { label: 'Подтверждено', variant: 'default' },
  [BookingStatus.ACTIVE]: { label: 'Активно', variant: 'success' },
  [BookingStatus.COMPLETED]: { label: 'Завершено', variant: 'outline' },
  [BookingStatus.CANCELLED]: { label: 'Отменено', variant: 'destructive' },
  [BookingStatus.OVERDUE]: { label: 'Просрочено', variant: 'destructive' },
};

const paymentStatusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  [PaymentStatus.PENDING]: { label: 'Не оплачено', variant: 'destructive' },
  [PaymentStatus.PARTIAL]: { label: 'Частично', variant: 'warning' },
  [PaymentStatus.PAID]: { label: 'Оплачено', variant: 'success' },
  [PaymentStatus.REFUNDED]: { label: 'Возврат', variant: 'secondary' },
  [PaymentStatus.OVERDUE]: { label: 'Просрочено', variant: 'destructive' },
};

export default function BookingsPage() {
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  
  // Filters
  const [clientSearch, setClientSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | 'all'>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bookings', page, size, clientSearch, equipmentSearch, bookingStatus, paymentStatus, activeOnly, startDate, endDate],
    queryFn: () => bookingsService.getPaginated({
      page,
      size,
      query: clientSearch || undefined,
      equipment_query: equipmentSearch || undefined,
      booking_status: bookingStatus === 'all' ? undefined : bookingStatus,
      payment_status: paymentStatus === 'all' ? undefined : paymentStatus,
      active_only: activeOnly,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })
  });

  const handleResetFilters = () => {
    setClientSearch('');
    setEquipmentSearch('');
    setBookingStatus('all');
    setPaymentStatus('all');
    setActiveOnly(true);
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Бронирования</h1>
      </div>

      <div className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Фильтры</h2>
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
            <X className="mr-2 h-3 w-3" /> Сбросить
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Клиент</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input 
                placeholder="Поиск клиента..." 
                className="h-8 pl-8 text-sm" 
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Оборудование</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input 
                placeholder="Поиск оборудования..." 
                className="h-8 pl-8 text-sm"
                value={equipmentSearch}
                onChange={(e) => { setEquipmentSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="space-y-1">
             <Label className="text-xs">Статус бронирования</Label>
             <Select 
               value={bookingStatus} 
               onValueChange={(val) => { setBookingStatus(val as any); setPage(1); }}
             >
               <SelectTrigger className="h-8 text-sm">
                 <SelectValue placeholder="Все статусы" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Все статусы</SelectItem>
                 {Object.entries(bookingStatusMap).map(([key, val]) => (
                   <SelectItem key={key} value={key}>{val.label}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          <div className="space-y-1">
             <Label className="text-xs">Статус оплаты</Label>
             <Select 
               value={paymentStatus} 
               onValueChange={(val) => { setPaymentStatus(val as any); setPage(1); }}
             >
               <SelectTrigger className="h-8 text-sm">
                 <SelectValue placeholder="Все статусы" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Все статусы</SelectItem>
                 {Object.entries(paymentStatusMap).map(([key, val]) => (
                   <SelectItem key={key} value={key}>{val.label}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>
          
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Период</Label>
            <DateTimeRangePicker
               date={{
                 from: startDate ? parseISO(startDate) : undefined,
                 to: endDate ? parseISO(endDate) : undefined
               }}
               setDate={(range) => {
                 setStartDate(range?.from ? range.from.toISOString() : '');
                 setEndDate(range?.to ? range.to.toISOString() : '');
                 setPage(1);
               }}
               className="h-8"
            />
          </div>

          <div className="flex items-end pb-1">
             <div className="flex items-center space-x-2">
               <Checkbox 
                 id="active" 
                 checked={activeOnly} 
                 onCheckedChange={(checked) => { setActiveOnly(checked as boolean); setPage(1); }} 
               />
               <label htmlFor="active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                 Только активные
               </label>
             </div>
          </div>
        </div>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Оборудование</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Проект</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Оплата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={6} className="h-24 text-center">Загрузка...</TableCell></TableRow>
            ) : data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.client_name}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{item.equipment_name}</span>
                    {item.quantity > 1 && <span className="text-xs text-muted-foreground">Кол-во: {item.quantity}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                     <span className="flex items-center gap-1">
                       <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                       {format(parseISO(item.start_date), "dd.MM.yyyy HH:mm")}
                     </span>
                     <span className="text-xs text-muted-foreground ml-4">
                       до {format(parseISO(item.end_date), "dd.MM.yyyy HH:mm")}
                     </span>
                  </div>
                </TableCell>
                <TableCell>
                  {item.project_name ? (
                     <a href={`/projects/${item.project_id}`} className="text-primary hover:underline underline-offset-4">
                       {item.project_name}
                     </a>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={bookingStatusMap[item.booking_status]?.variant || 'outline'}>
                    {bookingStatusMap[item.booking_status]?.label || item.booking_status}
                  </Badge>
                </TableCell>
                <TableCell>
                   <Badge variant={paymentStatusMap[item.payment_status]?.variant || 'outline'}>
                    {paymentStatusMap[item.payment_status]?.label || item.payment_status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Бронирования не найдены</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Всего: {data?.total || 0}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Назад
          </Button>
          <div className="text-sm font-medium">
            Стр. {page} из {data?.pages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (data?.pages || 1) || isLoading}
          >
            Вперед
          </Button>
        </div>
      </div>
    </div>
  );
}
