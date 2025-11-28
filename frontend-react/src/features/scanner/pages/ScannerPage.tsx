import { useState } from 'react';
import { useBarcodeScanner } from '../../../hooks/useBarcodeScanner';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { equipmentService } from '../../../services/equipment';
import { Equipment } from '../../../types/equipment';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import { ScanBarcode, Trash2, Box, Info, History } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function ScannerPage() {
  const [lastScanned, setLastScanned] = useState<Equipment | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [session, setSession] = useLocalStorage<{ items: Equipment[] }>('scanner_session', { items: [] });
  
  const { addItem, clearCart } = useCart();
  const navigate = useNavigate();

  const processBarcode = async (barcode: string) => {
    if (!barcode) return;
    setIsScanning(true);
    try {
      const equipment = await equipmentService.getByBarcode(barcode);
      setLastScanned(equipment);
      addToSession(equipment);
      toast.success(`Отсканировано: ${equipment.name}`);
    } catch (error) {
      toast.error(`Штрихкод не найден: ${barcode}`);
      setLastScanned(null);
    } finally {
      setIsScanning(false);
    }
  };

  useBarcodeScanner({
    onScan: processBarcode
  });

  const addToSession = (item: Equipment) => {
    setSession(prev => {
      return { ...prev, items: [item, ...prev.items] };
    });
  };

  const clearSession = () => {
    if (confirm('Очистить текущую сессию?')) {
      setSession({ items: [] });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(manualBarcode);
    setManualBarcode('');
  };

  const handleCreateProject = () => {
    if (session.items.length === 0) return;
    
    if (confirm('Создать проект из текущей сессии? Корзина будет очищена.')) {
      clearCart();
      // Add items from session to cart
      // We iterate in reverse to keep chronological order if session is [newest...oldest]
      // Actually scanner usually adds to top list, so reversing restores scan order.
      [...session.items].reverse().forEach(item => addItem(item));
      
      toast.success('Товары добавлены в корзину');
      navigate('/projects/new');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 md:flex-row">
      {/* Left Panel: Scan Result & Actions */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Manual Entry */}
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input 
              placeholder="Ввод штрихкода вручную..." 
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={isScanning}>
              <ScanBarcode className="mr-2 h-4 w-4" />
              Найти
            </Button>
          </form>
        </div>

        {/* Result Card */}
        <div className="bg-card border rounded-lg p-6 shadow-sm flex-1 flex flex-col justify-center items-center text-center">
          {lastScanned ? (
            <div className="space-y-4 w-full">
              <Badge variant={lastScanned.status === 'AVAILABLE' ? 'success' : 'secondary'} className="mb-2">
                {lastScanned.status}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">{lastScanned.name}</h2>
              <p className="text-muted-foreground text-lg">{lastScanned.category_name}</p>
              
              <div className="grid grid-cols-2 gap-4 text-left bg-muted/20 p-4 rounded-md mt-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Штрихкод</span>
                  <span className="font-mono">{lastScanned.barcode}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Серийный номер</span>
                  <span className="font-mono">{lastScanned.serial_number || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Стоимость</span>
                  <span>{lastScanned.replacement_cost} ₽</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">ID</span>
                  <span>{lastScanned.id}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-center mt-6">
                <Button variant="outline">
                  <Info className="mr-2 h-4 w-4" /> История
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground py-10">
              <ScanBarcode className="h-24 w-24 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Готов к сканированию</p>
              <p className="text-sm">Используйте сканер или введите код вручную</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Session List */}
      <div className="w-full md:w-96 flex flex-col gap-4">
        <div className="bg-card border rounded-lg flex flex-col h-full shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/40 flex justify-between items-center">
            <div className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Сессия ({session.items.length})
            </div>
            <Button variant="ghost" size="sm" onClick={clearSession} disabled={session.items.length === 0}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto p-0">
            {session.items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                Нет отсканированных элементов
              </div>
            ) : (
              <div className="divide-y">
                {session.items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="p-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                    <div className="overflow-hidden">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>{item.barcode}</span>
                        <span>•</span>
                        <span>{item.category_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-muted/40">
             <Button className="w-full" disabled={session.items.length === 0} onClick={handleCreateProject}>
               <Box className="mr-2 h-4 w-4" /> Создать проект
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
