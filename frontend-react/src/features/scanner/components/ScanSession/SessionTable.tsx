/**
 * Session Table Component
 * Table displaying all session items with search and actions
 */

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SessionItem } from '../../types/scanner.types';
import { SessionTableRow } from './SessionTableRow';
import { AnimatePresence } from 'framer-motion';

export interface SessionTableProps {
  items: SessionItem[];
  searchTerm?: string;
  onRemoveItem: (equipmentId: number, serialNumber?: string) => void;
  onIncrementQuantity: (equipmentId: number) => void;
  onDecrementQuantity: (equipmentId: number) => void;
  onItemClick?: (item: SessionItem) => void;
}

export function SessionTable({
  items,
  searchTerm,
  onRemoveItem,
  onIncrementQuantity,
  onDecrementQuantity,
  onItemClick,
}: SessionTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Штрих-код</TableHead>
            <TableHead>Серийный номер</TableHead>
            <TableHead className="text-center">Кол-во</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              // Generate unique key based on serial number or equipment_id
              const key = item.serial_number
                ? `${item.equipment_id}-${item.serial_number}`
                : `${item.equipment_id}`;

              return (
                <SessionTableRow
                  key={key}
                  item={item}
                  searchTerm={searchTerm}
                  onRemove={() =>
                    onRemoveItem(item.equipment_id, item.serial_number ?? undefined)
                  }
                  onIncrement={
                    !item.serial_number
                      ? () => onIncrementQuantity(item.equipment_id)
                      : undefined
                  }
                  onDecrement={
                    !item.serial_number
                      ? () => onDecrementQuantity(item.equipment_id)
                      : undefined
                  }
                  onClick={
                    onItemClick ? () => onItemClick(item) : undefined
                  }
                />
              );
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
