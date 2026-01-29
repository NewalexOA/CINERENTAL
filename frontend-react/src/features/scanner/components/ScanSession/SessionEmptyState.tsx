/**
 * Session Empty State Component
 * Displays empty states for no session or no items
 */

import { Button } from '@/components/ui/button';
import { FolderPlus, PackageOpen } from 'lucide-react';

export interface SessionEmptyStateProps {
  type: 'no_session' | 'no_items';
  onCreateSession?: () => void;
}

export function SessionEmptyState({
  type,
  onCreateSession,
}: SessionEmptyStateProps) {
  if (type === 'no_session') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderPlus className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Active Session</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Create a new session to start scanning equipment or load an existing
          session.
        </p>
        {onCreateSession && (
          <Button onClick={onCreateSession} className="gap-2">
            <FolderPlus className="h-4 w-4" />
            Create Session
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <PackageOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Session is Empty</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Use the barcode scanner or search to add equipment to this session.
      </p>
    </div>
  );
}
