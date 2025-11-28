import { createContext, useContext, useState, ReactNode } from 'react';
import { Equipment } from '../types/equipment';

export interface CartItem extends Equipment {
  quantity: number;
  start_date?: string | null; // ISO string
  end_date?: string | null; // ISO string
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Equipment) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  updateItemDates: (id: number, dates: { start: string | null; end: string | null }) => void;
  clearCart: () => void;
  dates: { start: string | null; end: string | null };
  setDates: (dates: { start: string | null; end: string | null }) => void;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [dates, setDates] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  const addItem = (item: Equipment) => {
    setItems((current) => {
      const existing = current.find((i) => i.id === item.id);
      if (existing) {
        return current.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      // Initialize with global dates if set
      return [...current, { 
        ...item, 
        quantity: 1, 
        start_date: dates.start, 
        end_date: dates.end 
      }];
    });
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((current) =>
      current.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const updateItemDates = (id: number, dateRange: { start: string | null; end: string | null }) => {
    setItems((current) =>
      current.map((i) => (i.id === id ? { ...i, start_date: dateRange.start, end_date: dateRange.end } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setDates({ start: null, end: null });
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateItemDates,
        clearCart,
        dates,
        setDates,
        totalItems
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
