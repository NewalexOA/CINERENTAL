import { Category } from "../types/category";

export interface CategoryWithDepth extends Category {
  depth: number;
}

export function flattenCategories(categories: Category[]): CategoryWithDepth[] {
  if (!categories) return [];

  const map = new Map<number, Category[]>();

  // Group by parent_id. Root categories have parent_id = null
  // We treat null as 0 for map keys logic
  categories.forEach(cat => {
    const pid = cat.parent_id || 0;
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
