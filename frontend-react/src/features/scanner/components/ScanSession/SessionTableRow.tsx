/**
 * Session Table Row Component
 * Single item row with actions and search highlighting
 */

import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { X, Plus, Minus } from 'lucide-react';
import { SessionItem } from '../../types/scanner.types';
import { motion } from 'framer-motion';

export interface SessionTableRowProps {
  item: SessionItem;
  searchTerm?: string;
  onRemove: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onClick?: () => void;
}

/**
 * Highlight matching search terms in text
 */
function highlightText(text: string, searchTerm?: string): React.ReactNode {
  if (!searchTerm || !text) return text;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === searchTerm.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 text-black rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function SessionTableRow({
  item,
  searchTerm,
  onRemove,
  onIncrement,
  onDecrement,
  onClick,
}: SessionTableRowProps) {
  const hasSerialNumber = !!item.serial_number;
  const showQuantityControls = !hasSerialNumber && onIncrement && onDecrement;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      <TableCell className="font-medium">
        {highlightText(item.name, searchTerm)}
      </TableCell>

      <TableCell>{highlightText(item.category_name, searchTerm)}</TableCell>

      <TableCell className="font-mono text-sm">
        {highlightText(item.barcode, searchTerm)}
      </TableCell>

      <TableCell className="font-mono text-sm text-muted-foreground">
        {item.serial_number
          ? highlightText(item.serial_number, searchTerm)
          : '—'}
      </TableCell>

      <TableCell className="text-center">
        {showQuantityControls ? (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement();
              }}
              className="h-7 w-7"
              title="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="min-w-[2ch] text-center font-semibold">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onIncrement();
              }}
              className="h-7 w-7"
              title="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">{item.quantity}</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Remove from session"
        >
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
    </motion.tr>
  );
}
