import { useState } from 'react';
import { useCart } from '../../../context/CartContext';
import { EquipmentPicker } from '../../equipment/components/EquipmentPicker';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { Trash2, Save } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { projectsService } from '../../../services/projects';
import { clientsService } from '../../../services/clients';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ProjectStatus } from '../../../types/project';

export default function NewProjectPage() {
  const { items, addItem, removeItem, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  
  // Project Form State
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsService.getAll
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      // 1. Create Project
      const project = await projectsService.create({
        name,
        client_id: Number(clientId),
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        description,
        status: ProjectStatus.DRAFT
      });

      // 2. Add Bookings (Items)
      // Log for now
      console.log('Project created:', project);
      console.log('Items to book:', items);
      
      return project;
    },
    onSuccess: () => {
      toast.success('Проект успешно создан');
      clearCart();
      navigate('/projects');
    },
    onError: (err) => {
      toast.error('Ошибка при создании проекта');
      console.error(err);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId || items.length === 0) {
      toast.error('Заполните обязательные поля и добавьте оборудование');
      return;
    }
    createProjectMutation.mutate();
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden">
      {/* Left: Project Details & Cart */}
      <div className="flex-1 flex flex-col gap-4 overflow-auto p-1">
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Детали проекта</h2>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название проекта *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Съемка клипа" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client">Клиент *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Начало</Label>
                <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Окончание</Label>
                <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </form>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-sm flex-1 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Корзина ({items.length})</h2>
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">Очистить</Button>
          </div>
          
          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Оборудование</TableHead>
                  <TableHead className="w-[100px]">Кол-во</TableHead>
                  <TableHead className="w-[100px] text-right">Цена</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Корзина пуста</TableCell></TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        min="1" 
                        className="h-8 w-20" 
                        value={item.quantity} 
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right">{item.replacement_cost * item.quantity} ₽</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <div className="text-lg font-bold">
              Итого: {items.reduce((sum, i) => sum + i.replacement_cost * i.quantity, 0)} ₽
            </div>
            <Button size="lg" onClick={handleSubmit} disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>}
              <Save className="mr-2 h-4 w-4" />
              Создать проект
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Equipment Picker */}
      <div className="w-full md:w-[400px] bg-card border rounded-lg p-4 shadow-sm flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4">Добавить оборудование</h2>
        <div className="flex-1 overflow-hidden">
          <EquipmentPicker onAdd={addItem} />
        </div>
      </div>
    </div>
  );
}
