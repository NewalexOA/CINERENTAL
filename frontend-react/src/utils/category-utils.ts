import { Category } from "../types/category";

export interface CategoryWithDepth extends Category {
  depth: number;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  hasChildren: boolean;
}

export function flattenCategories(categories: Category[]): CategoryWithDepth[] {
  if (!categories) return [];

  const map = new Map<number, Category[]>();

  // Group by parent_id. Root categories have parent_id = null/undefined
  // We treat null/undefined as 0 for map keys logic (using ?? to handle 0 correctly)
  categories.forEach(cat => {
    const pid = cat.parent_id ?? 0;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(cat);
  });

  const result: CategoryWithDepth[] = [];

  function traverse(parentId: number, depth: number) {
    const children = map.get(parentId);
    if (!children) return;

    // Sort by ID (matches legacy frontend)
    children.sort((a, b) => a.id - b.id);

    children.forEach(cat => {
      result.push({ ...cat, depth });
      traverse(cat.id, depth + 1);
    });
  }

  // Start traversal from root (key 0)
  traverse(0, 0);

  return result;
}

/**
 * Build a tree structure from flat category list
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  if (!categories || categories.length === 0) return [];

  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // First pass: create all nodes
  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [], hasChildren: false });
  });

  // Second pass: build parent-child relationships
  // Use != null to correctly handle parent_id = 0 (truthy check would fail for 0)
  categories.forEach(cat => {
    const node = map.get(cat.id)!;
    if (cat.parent_id != null && map.has(cat.parent_id)) {
      const parent = map.get(cat.parent_id)!;
      parent.children.push(node);
      parent.hasChildren = true;
    } else {
      roots.push(node);
    }
  });

  // Sort recursively by ID (matches legacy frontend)
  const sortRecursive = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.id - b.id);
    nodes.forEach(n => sortRecursive(n.children));
  };
  sortRecursive(roots);

  return roots;
}

/**
 * Get all descendant IDs for a category (excludes the category itself)
 * Used to filter parent select to prevent cycles
 * @param categories - Flat list of categories (used if tree not provided)
 * @param categoryId - ID of the category to get descendants for
 * @param tree - Optional pre-built tree to avoid rebuilding
 */
export function getDescendantIds(
  categories: Category[],
  categoryId: number,
  tree?: CategoryTreeNode[]
): number[] {
  const treeToUse = tree ?? buildCategoryTree(categories);
  const node = findCategoryInTree(treeToUse, categoryId);

  if (!node) return [];

  const ids: number[] = [];
  const collectChildIds = (n: CategoryTreeNode) => {
    n.children.forEach(child => {
      ids.push(child.id);
      collectChildIds(child);
    });
  };

  collectChildIds(node);
  return ids;
}

/**
 * Find a category by ID in the tree
 * Includes cycle detection to prevent infinite recursion with corrupted data
 * @param nodes - Tree nodes to search
 * @param id - Category ID to find
 * @param visited - Internal Set to track visited nodes (do not pass externally)
 */
export function findCategoryInTree(
  nodes: CategoryTreeNode[],
  id: number,
  visited: Set<number> = new Set()
): CategoryTreeNode | null {
  for (const node of nodes) {
    // Cycle detection
    if (visited.has(node.id)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cycle detected in category tree:', node.id);
      }
      continue;
    }
    visited.add(node.id);

    if (node.id === id) return node;
    const found = findCategoryInTree(node.children, id, visited);
    if (found) return found;
  }
  return null;
}

/**
 * Check if moving a category to a new parent would create a cycle
 * @param categories - Flat list of categories (used if tree not provided)
 * @param categoryId - ID of the category being moved
 * @param newParentId - ID of the new parent (null for root)
 * @param tree - Optional pre-built tree to avoid rebuilding
 */
export function wouldCreateCycle(
  categories: Category[],
  categoryId: number,
  newParentId: number | null,
  tree?: CategoryTreeNode[]
): boolean {
  if (newParentId === null) return false;
  if (categoryId === newParentId) return true;

  const descendantIds = getDescendantIds(categories, categoryId, tree);
  return descendantIds.includes(newParentId);
}
