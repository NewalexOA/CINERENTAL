/**
 * QuickActionsCard Component
 * Quick action buttons for scanned equipment operations
 */

import { Settings, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuickActionsCardProps {
  hasEquipment: boolean;
  onUpdateStatus: () => void;
  onViewHistory: () => void;
  onCreateProject?: () => void;
  itemCount?: number;
}

/**
 * QuickActionsCard
 *
 * Provides quick access to common scanner operations
 *
 * Features:
 * - Update Status: Modify equipment status
 * - View History: Show equipment booking history
 * - Create Project: Start new project with scanned items
 * - Conditional enabling based on session state
 * - Item count badge on create project button
 *
 * @example
 * <QuickActionsCard
 *   hasEquipment={true}
 *   onUpdateStatus={() => openStatusSheet()}
 *   onViewHistory={() => openHistoryPanel()}
 *   onCreateProject={() => navigate('/projects/create')}
 *   itemCount={5}
 * />
 */
export function QuickActionsCard({
  hasEquipment,
  onUpdateStatus,
  onViewHistory,
  onCreateProject,
  itemCount = 0,
}: QuickActionsCardProps) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Быстрые действия</h3>
      <div className="space-y-2">
        {/* Update Status Button */}
        <Button
          onClick={onUpdateStatus}
          disabled={!hasEquipment}
          variant="outline"
          className="w-full justify-start"
          size="lg"
        >
          <Settings className="h-5 w-5 mr-3" />
          <span>Изменить статус</span>
        </Button>

        {/* View History Button */}
        <Button
          onClick={onViewHistory}
          disabled={!hasEquipment}
          variant="outline"
          className="w-full justify-start"
          size="lg"
        >
          <History className="h-5 w-5 mr-3" />
          <span>История</span>
        </Button>

        {/* Create Project Button */}
        {onCreateProject && (
          <Button
            onClick={onCreateProject}
            disabled={itemCount === 0}
            variant="default"
            className="w-full justify-start relative"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-3" />
            <span>Создать проект</span>
            {itemCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-auto"
              >
                {itemCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Help Text */}
        <div className="pt-2">
          <p className="text-xs text-muted-foreground">
            {!hasEquipment && itemCount === 0 && (
              'Отсканируйте оборудование для выполнения действий'
            )}
            {hasEquipment && itemCount === 0 && (
              'Отсканируйте ещё оборудование для создания проекта'
            )}
            {itemCount > 0 && (
              `${itemCount} шт. готово для проекта`
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Accessibility:
 * - Semantic button elements with clear labels
 * - Disabled state with visual and functional feedback
 * - Icon + text labels for clarity
 * - Keyboard navigation support
 * - ARIA labels for icon-only elements
 *
 * Performance:
 * - No heavy computations
 * - Simple conditional rendering
 * - CSS-based styling (no JS animations)
 *
 * Usage:
 *
 * // Basic usage
 * <QuickActionsCard
 *   hasEquipment={sessionItems.length > 0}
 *   onUpdateStatus={() => setStatusSheetOpen(true)}
 *   onViewHistory={() => setHistoryPanelOpen(true)}
 * />
 *
 * // With project creation
 * <QuickActionsCard
 *   hasEquipment={sessionItems.length > 0}
 *   onUpdateStatus={() => setStatusSheetOpen(true)}
 *   onViewHistory={() => setHistoryPanelOpen(true)}
 *   onCreateProject={() => navigate('/projects/create')}
 *   itemCount={sessionItems.length}
 * />
 *
 * // Disabled state
 * <QuickActionsCard
 *   hasEquipment={false}
 *   onUpdateStatus={() => {}}
 *   onViewHistory={() => {}}
 *   itemCount={0}
 * />
 */
