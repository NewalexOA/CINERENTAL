/**
 * Session Search Component
 * Search input with debounce and item counter
 */

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SCANNER_CONSTANTS } from '../../types/scanner.types';

export interface SessionSearchProps {
  value: string;
  onChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
}

export function SessionSearch({
  value,
  onChange,
  totalCount,
  filteredCount,
}: SessionSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced onChange
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(localValue);
    }, SCANNER_CONSTANTS.SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localValue, onChange]);

  // Keyboard shortcut: Cmd+F / Ctrl+F focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-3 border-b bg-muted/50 p-3">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Поиск по названию, штрих-коду, категории... (Cmd+F)"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {localValue && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            title="Очистить поиск"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Counter */}
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {value ? (
          <span>
            Показано <strong>{filteredCount}</strong> из{' '}
            <strong>{totalCount}</strong>
          </span>
        ) : (
          <span>
            Всего: <strong>{totalCount}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
