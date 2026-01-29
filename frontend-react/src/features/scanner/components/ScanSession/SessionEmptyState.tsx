/**
 * Session Empty State Component
 * Displays empty states for no session or no items
 */

import { Button } from '@/components/ui/button';
import { FolderPlus, PackageOpen, FolderOpen } from 'lucide-react';

export interface SessionEmptyStateProps {
  type: 'no_session' | 'no_items';
  onCreateSession?: () => void;
  onManageSessions?: () => void;
}

export function SessionEmptyState({
  type,
  onCreateSession,
  onManageSessions,
}: SessionEmptyStateProps) {
  if (type === 'no_session') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderPlus className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Нет активной сессии</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Создайте новую сессию для сканирования оборудования или загрузите
          существующую.
        </p>
        <div className="flex gap-3">
          {onCreateSession && (
            <Button onClick={onCreateSession} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Создать сессию
            </Button>
          )}
          {onManageSessions && (
            <Button variant="outline" onClick={onManageSessions} className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Загрузить сессию
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <PackageOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Сессия пуста</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Используйте сканер штрих-кодов или поиск для добавления оборудования в сессию.
      </p>
    </div>
  );
}
