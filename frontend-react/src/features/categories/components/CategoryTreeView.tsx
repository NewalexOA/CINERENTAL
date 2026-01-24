import { useState, useEffect, useMemo, useCallback, memo, useRef, KeyboardEvent } from "react";
import { Search, FolderPlus } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { CategoryTreeNode } from "./CategoryTreeNode";
import {
  CategoryTreeNode as CategoryTreeNodeType,
  buildCategoryTree,
} from "../../../utils/category-utils";
import { Category } from "../../../types/category";
import { useDebounce } from "../../../hooks/useDebounce";

interface CategoryTreeViewProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddChild: (parentId: number | null) => void;
}

const STORAGE_KEY = "categories-expanded-nodes";
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Find node by ID in tree structure (pure function, no component dependencies)
 */
const findNodeInTree = (nodes: CategoryTreeNodeType[], id: number): CategoryTreeNodeType | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeInTree(node.children, id);
    if (found) return found;
  }
  return null;
};

export const CategoryTreeView = memo(function CategoryTreeView({
  categories,
  selectedId,
  onSelect,
  onAddChild,
}: CategoryTreeViewProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load expanded nodes from localStorage:', e);
      }
      return new Set();
    }
  });

  // Save expanded state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds]));
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save expanded nodes to localStorage:', e);
      }
    }
  }, [expandedIds]);

  // Build tree structure
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    if (!debouncedSearch.trim()) return tree;

    const searchLower = debouncedSearch.toLowerCase();

    const filterNode = (node: CategoryTreeNodeType): CategoryTreeNodeType | null => {
      const matchesSearch =
        node.name.toLowerCase().includes(searchLower) ||
        node.description?.toLowerCase().includes(searchLower);

      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is CategoryTreeNodeType => n !== null);

      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          hasChildren: filteredChildren.length > 0,
        };
      }

      return null;
    };

    return tree
      .map(filterNode)
      .filter((n): n is CategoryTreeNodeType => n !== null);
  }, [tree, debouncedSearch]);

  // Get all category IDs for expanding on search (skip when not searching)
  const allIds = useMemo(() => {
    if (!debouncedSearch.trim()) return [];

    const ids: number[] = [];
    const collectIds = (nodes: CategoryTreeNodeType[]) => {
      nodes.forEach((node) => {
        ids.push(node.id);
        collectIds(node.children);
      });
    };
    collectIds(filteredTree);
    return ids;
  }, [filteredTree, debouncedSearch]);

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand all parents when searching
  useEffect(() => {
    if (debouncedSearch.trim()) {
      setExpandedIds(new Set(allIds));
    }
  }, [debouncedSearch, allIds]);

  // Get flat list of visible node IDs for keyboard navigation
  const visibleNodeIds = useMemo(() => {
    const ids: number[] = [];
    const collect = (nodes: CategoryTreeNodeType[]) => {
      nodes.forEach((node) => {
        ids.push(node.id);
        if (expandedIds.has(node.id) && node.children.length > 0) {
          collect(node.children);
        }
      });
    };
    collect(filteredTree);
    return ids;
  }, [filteredTree, expandedIds]);

  const treeRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedId) {
      // If nothing selected and there are nodes, select first
      if (visibleNodeIds.length > 0 && (e.key === 'ArrowDown' || e.key === 'Home')) {
        e.preventDefault();
        onSelect(visibleNodeIds[0]);
      }
      return;
    }

    const currentIndex = visibleNodeIds.indexOf(selectedId);
    const currentNode = findNodeInTree(filteredTree, selectedId);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < visibleNodeIds.length - 1) {
          onSelect(visibleNodeIds[currentIndex + 1]);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          onSelect(visibleNodeIds[currentIndex - 1]);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (currentNode?.hasChildren && !expandedIds.has(selectedId)) {
          toggleExpanded(selectedId);
        } else if (currentNode?.hasChildren && expandedIds.has(selectedId) && currentNode.children.length > 0) {
          onSelect(currentNode.children[0].id);
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (currentNode?.hasChildren && expandedIds.has(selectedId)) {
          toggleExpanded(selectedId);
        } else if (currentNode?.parent_id) {
          onSelect(currentNode.parent_id);
        }
        break;

      case 'Home':
        e.preventDefault();
        if (visibleNodeIds.length > 0) {
          onSelect(visibleNodeIds[0]);
        }
        break;

      case 'End':
        e.preventDefault();
        if (visibleNodeIds.length > 0) {
          onSelect(visibleNodeIds[visibleNodeIds.length - 1]);
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentNode?.hasChildren) {
          toggleExpanded(selectedId);
        }
        break;
    }
  }, [selectedId, visibleNodeIds, filteredTree, expandedIds, onSelect, toggleExpanded]);

  return (
    <div className="flex flex-col h-full">
      {/* Search and Add Root */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск категорий..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            aria-label="Поиск категорий"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onAddChild(null)}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          Добавить категорию
        </Button>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div
          ref={treeRef}
          className="p-2"
          role="tree"
          aria-label="Дерево категорий"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {filteredTree.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {debouncedSearch ? "Категории не найдены" : "Нет категорий"}
            </div>
          ) : (
            filteredTree.map((node, index) => (
              <CategoryTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggle={toggleExpanded}
                onAddChild={onAddChild}
                setSize={filteredTree.length}
                posInSet={index + 1}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
