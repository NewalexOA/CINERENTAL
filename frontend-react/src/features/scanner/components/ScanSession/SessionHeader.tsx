/**
 * Session Header Component
 * Displays session metadata, sync status, and management actions
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
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
      return { color: 'bg-green-500', label: 'Синхронизировано' };
    case 'dirty':
      return { color: 'bg-yellow-500', label: 'Несохранённые изменения' };
    case 'error':
      return { color: 'bg-red-500', label: 'Ошибка синхронизации' };
    case 'local_only':
      return { color: 'bg-gray-400', label: 'Только локально' };
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
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
      {/* Session info */}
      <h2 className="text-sm font-semibold truncate max-w-[200px]" title={sessionName}>
        {sessionName}
      </h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRenameSession}
        className="h-7 w-7 shrink-0"
        title="Переименовать сессию"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </Button>
      <Badge variant="secondary" className="shrink-0 whitespace-nowrap">{itemCount} шт.</Badge>
      <div
        className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusConfig.color)}
        title={statusConfig.label}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="icon"
          onClick={onNewSession}
          className="h-8 w-8"
          title="Новая сессия"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLoadSession}
          className="h-8 w-8"
          title="Загрузить сессию"
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onManageSessions}
          className="h-8 w-8"
          title="Управление сессиями"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onSync}
          disabled={isSyncing || syncStatus === 'synced'}
          className="gap-1.5"
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
