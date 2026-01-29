/**
 * Session Management Panel - Right slide-over
 * Manages local and server scan sessions
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Cloud,
  Loader2,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import type { ScanSession, ServerScanSession } from '../../types/scanner.types';

interface SessionManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ScanSession[];
  activeSessionId: string | null;
  serverSessions?: ServerScanSession[];
  onLoadSession: (sessionId: string) => void;
  onLoadServerSession: (serverSession: ServerScanSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateSession: (name: string) => void;
  onCleanExpired: () => void;
  onResetAll: () => void;
  isLoading?: boolean;
}

export function SessionManagementPanel({
  open,
  onOpenChange,
  sessions,
  activeSessionId,
  serverSessions,
  onLoadSession,
  onLoadServerSession,
  onDeleteSession,
  onCreateSession,
  onCleanExpired,
  onResetAll,
  isLoading = false,
}: SessionManagementPanelProps) {
  const [newSessionName, setNewSessionName] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      onCreateSession(newSessionName.trim());
      setNewSessionName('');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
  };

  const confirmDeleteSession = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete);
      setSessionToDelete(null);
    }
  };

  const getSyncStatusBadge = (session: ScanSession) => {
    if (session.syncedWithServer && !session.dirty) {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Synced
        </Badge>
      );
    }
    if (session.dirty) {
      return (
        <Badge variant="warning" className="gap-1">
          <Upload className="h-3 w-3" />
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Cloud className="h-3 w-3" />
        Local
      </Badge>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Session Management</SheetTitle>
            <SheetDescription>
              Manage local and server scan sessions
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Create New Session */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Create New Session</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Session name..."
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim() || isLoading}
                  size="default"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </div>
            </div>

            {/* Sessions Tabs */}
            <Tabs defaultValue="local" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="local">
                  Local Sessions ({sessions.length})
                </TabsTrigger>
                <TabsTrigger value="server">
                  Server Sessions ({serverSessions?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Local Sessions Tab */}
              <TabsContent value="local" className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Cloud className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No local sessions found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create a new session to get started
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((session) => (
                          <TableRow
                            key={session.id}
                            className={
                              session.id === activeSessionId
                                ? 'bg-muted/50'
                                : ''
                            }
                          >
                            <TableCell className="font-medium">
                              {session.name}
                              {session.id === activeSessionId && (
                                <Badge
                                  variant="default"
                                  className="ml-2 text-xs"
                                >
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(
                                new Date(session.createdAt),
                                'MMM d, HH:mm'
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(
                                new Date(session.updatedAt),
                                'MMM d, HH:mm'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {session.items.length}
                            </TableCell>
                            <TableCell>{getSyncStatusBadge(session)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onLoadSession(session.id)}
                                  disabled={
                                    session.id === activeSessionId || isLoading
                                  }
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSession(session.id)}
                                  disabled={
                                    session.id === activeSessionId || isLoading
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Server Sessions Tab */}
              <TabsContent value="server" className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !serverSessions || serverSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Cloud className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No server sessions found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sync local sessions to see them here
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serverSessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium">
                              {session.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(
                                new Date(session.created_at),
                                'MMM d, HH:mm'
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(
                                new Date(session.updated_at),
                                'MMM d, HH:mm'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {session.items.length}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onLoadServerSession(session)}
                                disabled={isLoading}
                              >
                                Load
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onCleanExpired}
                disabled={isLoading}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clean Expired
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowResetConfirm(true)}
                disabled={isLoading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Session Confirmation */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={() => setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This session and all its items will
              be permanently deleted from local storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all local sessions, scan history, and
              settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onResetAll();
                setShowResetConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
