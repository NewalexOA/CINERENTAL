/**
 * Session Header Component
 * Displays session metadata, sync status, and management actions
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FolderOpen,
  FolderPlus,
  Settings,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import { SyncStatus } from '../../types/scanner.types';
import { cn } from '@/lib/utils';

export interface SessionHeaderProps {
  sessionName: string;
  itemCount: number;
  syncStatus: SyncStatus;
  onNewSession: () => void;
  onLoadSession: () => void;
  onManageSessions: () => void;
  onRenameSession: () => void;
  onSync: () => void;
  isSyncing?: boolean;
}

/**
 * Get sync status indicator configuration
 */
const getSyncStatusConfig = (status: SyncStatus) => {
  switch (status) {
    case 'synced':
      return {
        color: 'bg-green-500',
        label: 'Синхронизировано',
        variant: 'success' as const,
      };
    case 'dirty':
      return {
        color: 'bg-yellow-500',
        label: 'Несохранённые изменения',
        variant: 'warning' as const,
      };
    case 'error':
      return {
        color: 'bg-red-500',
        label: 'Ошибка синхронизации',
        variant: 'destructive' as const,
      };
    case 'local_only':
      return {
        color: 'bg-gray-400',
        label: 'Только локально',
        variant: 'secondary' as const,
      };
  }
};

export function SessionHeader({
  sessionName,
  itemCount,
  syncStatus,
  onNewSession,
  onLoadSession,
  onManageSessions,
  onRenameSession,
  onSync,
  isSyncing = false,
}: SessionHeaderProps) {
  const statusConfig = getSyncStatusConfig(syncStatus);

  return (
    <div className="flex items-center justify-between border-b bg-card p-4">
      {/* Left: Session info */}
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{sessionName}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRenameSession}
            className="h-8 w-8"
            title="Переименовать сессию"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
        <Badge variant="secondary">{itemCount} шт.</Badge>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              statusConfig.color
            )}
          />
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onNewSession}
          className="gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          Новая
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadSession}
          className="gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          Загрузить
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onManageSessions}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Управление
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onSync}
          disabled={isSyncing || syncStatus === 'synced'}
          className="gap-2"
        >
          <RefreshCw
            className={cn('h-4 w-4', isSyncing && 'animate-spin')}
          />
          {isSyncing ? 'Синхр...' : 'Синхр.'}
        </Button>
      </div>
    </div>
  );
}
