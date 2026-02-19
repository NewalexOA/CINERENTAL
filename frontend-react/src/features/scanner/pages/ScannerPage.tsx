import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
// Components
import {
  ScanResultCard,
  SessionHeader,
  SessionTable,
  SessionSearch,
  SessionEmptyState,
  ScanHistoryFeed,
  QuickActionsCard,
  SessionManagementPanel,
  EquipmentHistoryPanel,
  StatusUpdateSheet,
} from '../components';

// Hooks
import {
  useBarcodeScanner,
  useScanSession,
  useSessionSync,
  useScanFeedback,
  useKeyboardShortcuts,
} from '../hooks';

// API
import {
  useEquipmentByBarcode,
  useUpdateEquipmentStatus,
  useScanSessions,
} from '../api';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Types
import { Equipment, EquipmentStatus } from '@/types/equipment';
import {
  ScanFeedbackType,
  ScanHistoryEntry,
  SessionItem,
  SCANNER_CONSTANTS,
  ServerScanSession,
} from '../types/scanner.types';

// Context
import { useCart } from '@/context/CartContext';

/**
 * Convert Equipment to SessionItem
 */
function equipmentToSessionItem(equipment: Equipment): SessionItem {
  return {
    equipment_id: equipment.id,
    name: equipment.name,
    barcode: equipment.barcode,
    serial_number: equipment.serial_number || null,
    category_id: equipment.category_id || null,
    category_name: equipment.category_name || 'Без категории',
    quantity: 1,
    replacement_cost: equipment.replacement_cost,
    status: equipment.status,
  };
}

/**
 * Scanner Page Component
 *
 * Main page for barcode scanning operations with:
 * - HID scanner support
 * - Session management (localStorage + server sync)
 * - Equipment lookup and display
 * - Keyboard shortcuts
 * - Sound/visual feedback
 */
export default function ScannerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addItem, clearCart } = useCart();

  // State
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScannedEquipment, setLastScannedEquipment] = useState<Equipment | null>(null);
  const [feedbackType, setFeedbackType] = useState<ScanFeedbackType | undefined>();
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Panel states
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);

  // Session management
  const {
    activeSession,
    sessions,
    createSession,
    addEquipment,
    removeEquipment,
    decrementQuantity,
    clearSession,
    deleteSession,
    renameSession,
    setActiveSession,
    markSynced,
  } = useScanSession();

  // Server sync
  const { syncNow, isSyncing, syncStatus } = useSessionSync({
    session: activeSession,
    enableAutoSync: true,
    onSyncSuccess: (serverSession) => {
      markSynced(serverSession.id);
      queryClient.invalidateQueries({ queryKey: ['scan-sessions'] });
    },
  });

  // Feedback
  const { triggerFeedback } = useScanFeedback();

  // Server sessions
  const { data: serverSessions = [] } = useScanSessions();

  // Equipment status update
  const updateStatusMutation = useUpdateEquipmentStatus();

  // Equipment lookup state
  const [lookupBarcode, setLookupBarcode] = useState<string | null>(null);
  const {
    data: lookedUpEquipment,
    isLoading: isLookingUp,
    error: lookupError,
  } = useEquipmentByBarcode(lookupBarcode || '', {
    enabled: !!lookupBarcode,
  });

  /**
   * Process barcode scan
   */
  const processBarcode = useCallback(
    (barcode: string) => {
      if (!barcode) return;
      setLookupBarcode(barcode);
    },
    []
  );

  /**
   * Handle equipment lookup result
   */
  useEffect(() => {
    if (!lookupBarcode) return;

    if (lookupError) {
      // Equipment not found
      const historyEntry: ScanHistoryEntry = {
        id: `scan_${Date.now()}`,
        barcode: lookupBarcode,
        equipment: null,
        timestamp: new Date().toISOString(),
        result: 'not_found',
        message: 'Оборудование не найдено',
      };

      setScanHistory((prev) => [historyEntry, ...prev].slice(0, SCANNER_CONSTANTS.MAX_HISTORY_ENTRIES));
      setFeedbackType('not_found');
      triggerFeedback('not_found');
      toast.error(`Штрих-код не найден: ${lookupBarcode}`);
      setLookupBarcode(null);
      return;
    }

    if (lookedUpEquipment) {
      setLastScannedEquipment(lookedUpEquipment);

      // Add to session if active
      if (activeSession) {
        const sessionItem = equipmentToSessionItem(lookedUpEquipment);
        const result = addEquipment(sessionItem);

        let feedback: ScanFeedbackType = 'success';
        let message = `Добавлено: ${lookedUpEquipment.name}`;

        if (result === 'duplicate') {
          feedback = 'duplicate';
          message = 'Уже в сессии';
        } else if (result === 'incremented') {
          feedback = 'quantity_updated';
          message = 'Количество увеличено';
        }

        const historyEntry: ScanHistoryEntry = {
          id: `scan_${Date.now()}`,
          barcode: lookupBarcode,
          equipment: sessionItem,
          timestamp: new Date().toISOString(),
          result: feedback,
          message,
        };

        setScanHistory((prev) => [historyEntry, ...prev].slice(0, SCANNER_CONSTANTS.MAX_HISTORY_ENTRIES));
        setFeedbackType(feedback);
        triggerFeedback(feedback);
        toast.success(message);
      } else {
        // No active session - just show equipment
        const historyEntry: ScanHistoryEntry = {
          id: `scan_${Date.now()}`,
          barcode: lookupBarcode,
          equipment: equipmentToSessionItem(lookedUpEquipment),
          timestamp: new Date().toISOString(),
          result: 'success',
          message: 'Найдено (нет активной сессии)',
        };

        setScanHistory((prev) => [historyEntry, ...prev].slice(0, SCANNER_CONSTANTS.MAX_HISTORY_ENTRIES));
        setFeedbackType('success');
        triggerFeedback('success');
        toast.info('Создайте сессию для добавления оборудования');
      }

      setLookupBarcode(null);
    }
  }, [lookedUpEquipment, lookupError, lookupBarcode, activeSession, addEquipment, triggerFeedback]);

  // Barcode scanner hook
  useBarcodeScanner({
    onScan: processBarcode,
    autoStart: true,
  });

  /**
   * Handle manual barcode submission
   */
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      processBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  /**
   * Handle create project from session
   */
  const handleCreateProject = () => {
    if (!activeSession || activeSession.items.length === 0) return;

    if (confirm('Создать проект из текущей сессии? Корзина будет очищена.')) {
      clearCart();

      // Add items to cart in reverse order to maintain scan order
      [...activeSession.items].reverse().forEach((item) => {
        addItem({
          id: item.equipment_id,
          name: item.name,
          barcode: item.barcode,
          serial_number: item.serial_number || undefined,
          category_id: item.category_id || undefined,
          category_name: item.category_name,
          replacement_cost: item.replacement_cost || 0,
          status: item.status || 'AVAILABLE',
        } as Equipment);
      });

      toast.success('Оборудование добавлено в корзину');
      navigate('/projects/new');
    }
  };

  /**
   * Handle view equipment history
   */
  const handleViewHistory = () => {
    if (lastScannedEquipment) {
      setSelectedEquipmentId(lastScannedEquipment.id);
      setHistoryPanelOpen(true);
    }
  };

  /**
   * Handle update equipment status
   */
  const handleUpdateStatus = () => {
    if (lastScannedEquipment) {
      setSelectedEquipmentId(lastScannedEquipment.id);
      setStatusSheetOpen(true);
    }
  };

  /**
   * Handle status update confirmation
   */
  const handleStatusUpdateConfirm = async (status: string) => {
    if (!selectedEquipmentId) return;

    try {
      await updateStatusMutation.mutateAsync({
        equipmentId: selectedEquipmentId,
        status: status as EquipmentStatus,
      });
      toast.success('Статус обновлен');
      setStatusSheetOpen(false);

      // Update last scanned equipment if same
      if (lastScannedEquipment?.id === selectedEquipmentId) {
        setLastScannedEquipment((prev) =>
          prev ? { ...prev, status: status as Equipment['status'] } : null
        );
      }
    } catch {
      toast.error('Ошибка обновления статуса');
    }
  };

  /**
   * Handle load server session
   */
  const handleLoadServerSession = (serverSession: ServerScanSession) => {
    createSession(serverSession.name, serverSession.items, serverSession.id);
    setSessionPanelOpen(false);
    toast.success(`Сессия "${serverSession.name}" загружена`);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewSession: () => {
      const name = prompt('Название новой сессии:');
      if (name) {
        createSession(name);
        toast.success(`Сессия "${name}" создана`);
      }
    },
    onLoadSession: () => setSessionPanelOpen(true),
    onSync: () => {
      syncNow();
      toast.info('Синхронизация...');
    },
    onCreateProject: handleCreateProject,
    onClearResult: () => {
      setLastScannedEquipment(null);
      setFeedbackType(undefined);
    },
    onFocusSearch: () => {
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
      searchInput?.focus();
    },
    enabled: true,
  });

  // Filter session items by search term
  const filteredItems = (activeSession?.items.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.barcode.toLowerCase().includes(term) ||
      item.category_name.toLowerCase().includes(term) ||
      (item.serial_number && item.serial_number.toLowerCase().includes(term))
    );
  }) || []).sort((a, b) => {
    // Newest first by addedAt timestamp
    const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Left Column - Main Content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-auto">
        {/* Manual Entry */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            placeholder="Введите штрих-код вручную..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            className="font-mono"
          />
          <Button type="submit" disabled={isLookingUp || !manualBarcode.trim()}>
            Найти
          </Button>
        </form>

        {/* Scan Result */}
        <ScanResultCard
          equipment={lastScannedEquipment}
          isLoading={isLookingUp}
          feedbackType={feedbackType}
          onViewHistory={handleViewHistory}
          onUpdateStatus={handleUpdateStatus}
        />

        {/* Session */}
        <div className="border rounded-md flex flex-col bg-card">
          {activeSession ? (
            <>
              <SessionHeader
                  sessionName={activeSession.name}
                  itemCount={activeSession.items.length}
                  syncStatus={syncStatus}
                  onNewSession={() => {
                    const name = prompt('Название новой сессии:');
                    if (name) {
                      createSession(name);
                      toast.success(`Сессия "${name}" создана`);
                    }
                  }}
                  onLoadSession={() => setSessionPanelOpen(true)}
                  onManageSessions={() => setSessionPanelOpen(true)}
                  onRenameSession={() => {
                    const name = prompt('Новое название:', activeSession.name);
                    if (name && name !== activeSession.name) {
                      renameSession(name);
                      toast.success('Сессия переименована');
                    }
                  }}
                  onSync={syncNow}
                  isSyncing={isSyncing}
                />

              <div className="px-4 pb-4">
                <SessionSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  totalCount={activeSession.items.length}
                  filteredCount={filteredItems.length}
                />

                <div className="mt-4">
                  {activeSession.items.length === 0 ? (
                    <SessionEmptyState type="no_items" />
                  ) : (
                    <SessionTable
                      items={filteredItems}
                      searchTerm={searchTerm}
                      onRemoveItem={removeEquipment}
                      onIncrementQuantity={(id) => {
                        const item = activeSession.items.find(
                          (i) => i.equipment_id === id && !i.serial_number
                        );
                        if (item) {
                          addEquipment({ ...item, quantity: 1 });
                        }
                      }}
                      onDecrementQuantity={decrementQuantity}
                      onItemClick={(item) => {
                        setSelectedEquipmentId(item.equipment_id);
                        setHistoryPanelOpen(true);
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="px-4 py-3 border-t">
                <Button
                  variant="outline"
                  onClick={clearSession}
                  disabled={activeSession.items.length === 0}
                >
                  Очистить
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center p-8">
              <SessionEmptyState
                type="no_session"
                onCreateSession={() => {
                  const name = prompt('Название сессии:');
                  if (name) {
                    createSession(name);
                    toast.success(`Сессия "${name}" создана`);
                  }
                }}
                onManageSessions={() => setSessionPanelOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Info & Actions */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <QuickActionsCard
          hasEquipment={!!lastScannedEquipment}
          onUpdateStatus={handleUpdateStatus}
          onViewHistory={handleViewHistory}
          onCreateProject={handleCreateProject}
          itemCount={activeSession?.items.length || 0}
        />

        <div className="flex-1 min-h-0">
          <h3 className="text-sm font-medium mb-2">История сканирования</h3>
          <ScanHistoryFeed
            entries={scanHistory}
            maxEntries={10}
            onEntryClick={(entry) => {
              if (entry.equipment) {
                setSelectedEquipmentId(entry.equipment.equipment_id);
                setHistoryPanelOpen(true);
              }
            }}
          />
        </div>
      </div>

      {/* Panels */}
      <SessionManagementPanel
        open={sessionPanelOpen}
        onOpenChange={setSessionPanelOpen}
        sessions={sessions}
        activeSessionId={activeSession?.id || null}
        serverSessions={serverSessions}
        onLoadSession={setActiveSession}
        onLoadServerSession={handleLoadServerSession}
        onDeleteSession={deleteSession}
        onCreateSession={(name) => {
          createSession(name);
          setSessionPanelOpen(false);
          toast.success(`Сессия "${name}" создана`);
        }}
        onCleanExpired={() => {
          toast.info('Очистка устаревших сессий...');
        }}
        onResetAll={() => {
          if (confirm('Удалить ВСЕ локальные сессии? Это действие нельзя отменить.')) {
            sessions.forEach((s) => deleteSession(s.id));
            toast.success('Все сессии удалены');
          }
        }}
      />

      <EquipmentHistoryPanel
        open={historyPanelOpen}
        onOpenChange={setHistoryPanelOpen}
        equipmentId={selectedEquipmentId}
        equipmentName={
          lastScannedEquipment?.id === selectedEquipmentId
            ? lastScannedEquipment?.name
            : undefined
        }
      />

      <StatusUpdateSheet
        open={statusSheetOpen}
        onOpenChange={setStatusSheetOpen}
        equipmentId={selectedEquipmentId}
        currentStatus={lastScannedEquipment?.status || 'AVAILABLE'}
        onStatusUpdate={handleStatusUpdateConfirm}
        isUpdating={updateStatusMutation.isPending}
      />
    </div>
  );
}
