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
import { Badge } from '../../../components/ui/badge';
import { Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DateTimeRangePicker } from '../../../components/ui/date-range-picker';
import { PaginationControls } from '../../../components/ui/pagination-controls';

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
  const [size, setSize] = useState(20);
  
  // Filters
  const [clientSearch, setClientSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | 'all'>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
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
    <div className="h-full flex flex-col space-y-2">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-xl font-bold tracking-tight">Бронирования</h1>
      </div>

      <div className="bg-card border rounded-md p-2 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground">Фильтры</h2>
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-6 text-xs text-muted-foreground">
            <X className="mr-1 h-3 w-3" /> Сбросить
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="space-y-1">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input 
                placeholder="Поиск клиента..." 
                className="h-7 pl-7 text-xs" 
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input 
                placeholder="Поиск оборудования..." 
                className="h-7 pl-7 text-xs"
                value={equipmentSearch}
                onChange={(e) => { setEquipmentSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="space-y-1">
             <Select 
               value={bookingStatus} 
               onValueChange={(val) => { setBookingStatus(val as BookingStatus | 'all'); setPage(1); }}
             >
               <SelectTrigger className="h-7 text-xs">
                 <SelectValue placeholder="Статус бронирования" />
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
             <Select 
               value={paymentStatus} 
               onValueChange={(val) => { setPaymentStatus(val as PaymentStatus | 'all'); setPage(1); }}
             >
               <SelectTrigger className="h-7 text-xs">
                 <SelectValue placeholder="Статус оплаты" />
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
               className="h-7"
               placeholder="Период бронирования"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
             <Checkbox 
               id="active" 
               checked={activeOnly} 
               onCheckedChange={(checked) => { setActiveOnly(checked as boolean); setPage(1); }} 
               className="h-4 w-4"
             />
             <label htmlFor="active" className="text-xs font-medium leading-none cursor-pointer">
               Только активные
             </label>
          </div>
        </div>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 py-0">Клиент</TableHead>
              <TableHead className="h-8 py-0">Оборудование</TableHead>
              <TableHead className="h-8 py-0">Период</TableHead>
              <TableHead className="h-8 py-0">Проект</TableHead>
              <TableHead className="h-8 py-0">Статус</TableHead>
              <TableHead className="h-8 py-0">Оплата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={6} className="h-24 text-center">Загрузка...</TableCell></TableRow>
            ) : data?.items.map((item) => (
              <TableRow key={item.id} className="h-8">
                <TableCell className="py-1 font-medium">
                  {item.client_name}
                </TableCell>
                <TableCell className="py-1">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[200px]">{item.equipment_name}</span>
                    {item.quantity > 1 && <span className="text-[10px] text-muted-foreground">x{item.quantity}</span>}
                  </div>
                </TableCell>
                <TableCell className="py-1">
                  <div className="flex flex-col text-[10px]">
                     <span className="flex items-center gap-1">
                       <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                       {format(parseISO(item.start_date), "dd.MM HH:mm")} - {format(parseISO(item.end_date), "dd.MM HH:mm")}
                     </span>
                  </div>
                </TableCell>
                <TableCell className="py-1">
                  {item.project_name ? (
                     <a href={`/projects/${item.project_id}`} className="text-primary hover:underline underline-offset-4 truncate max-w-[150px] block">
                       {item.project_name}
                     </a>
                  ) : '-'}
                </TableCell>
                <TableCell className="py-1">
                  <Badge variant={bookingStatusMap[item.booking_status]?.variant || 'outline'} className="px-1.5 py-0 text-[10px] h-5">
                    {bookingStatusMap[item.booking_status]?.label || item.booking_status}
                  </Badge>
                </TableCell>
                <TableCell className="py-1">
                   <Badge variant={paymentStatusMap[item.payment_status]?.variant || 'outline'} className="px-1.5 py-0 text-[10px] h-5">
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

      <PaginationControls 
        currentPage={page}
        totalPages={data?.pages || 1}
        pageSize={size}
        totalItems={data?.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setSize}
        disabled={isLoading}
      />
    </div>
  );
}
