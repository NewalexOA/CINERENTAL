import { memo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Plus,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";
import { CategoryTreeNode as CategoryTreeNodeType } from "../../../utils/category-utils";

interface CategoryTreeNodeProps {
  node: CategoryTreeNodeType;
  depth: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onAddChild: (parentId: number) => void;
  setSize: number;
  posInSet: number;
}

// Custom comparison to prevent re-renders when Set reference changes but expanded state is same
const arePropsEqual = (prev: CategoryTreeNodeProps, next: CategoryTreeNodeProps): boolean => {
  return (
    prev.node.id === next.node.id &&
    prev.node.name === next.node.name &&
    prev.node.hasChildren === next.node.hasChildren &&
    prev.node.equipment_count === next.node.equipment_count &&
    prev.node.children.length === next.node.children.length &&
    prev.depth === next.depth &&
    prev.selectedId === next.selectedId &&
    prev.setSize === next.setSize &&
    prev.posInSet === next.posInSet &&
    prev.expandedIds.has(prev.node.id) === next.expandedIds.has(next.node.id)
  );
};

export const CategoryTreeNode = memo(function CategoryTreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  onAddChild,
  setSize,
  posInSet,
}: CategoryTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div
      role="treeitem"
      aria-expanded={node.hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-level={depth + 1}
      aria-setsize={setSize}
      aria-posinset={posInSet}
    >
      <Collapsible open={isExpanded} onOpenChange={() => onToggle(node.id)}>
        <div
          className={cn(
            "group flex items-center gap-1 py-1 px-2 rounded-md transition-colors",
            isSelected && "bg-accent text-accent-foreground"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand/collapse button */}
          {node.hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 hover:bg-transparent"
                aria-label={isExpanded ? "Свернуть" : "Развернуть"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5" />
          )}

          {/* Clickable row content */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onSelect(node.id);
            }}
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -my-0.5 text-left",
              isSelected && "bg-transparent hover:bg-transparent"
            )}
          >
            {/* Folder/file icon */}
            {node.hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
              )
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            )}

            {/* Category name */}
            <span className="flex-1 truncate text-sm">{node.name}</span>

            {/* Equipment count badge */}
            {node.equipment_count !== undefined && node.equipment_count > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {node.equipment_count}
              </span>
            )}
          </button>

          {/* Add subcategory button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
            aria-label="Добавить подкатегорию"
            onClick={() => onAddChild(node.id)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Children */}
        {node.hasChildren && (
          <CollapsibleContent>
            <div role="group">
              {node.children.map((child, index) => (
                <CategoryTreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  onAddChild={onAddChild}
                  setSize={node.children.length}
                  posInSet={index + 1}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}, arePropsEqual);
