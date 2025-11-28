export interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  description?: string;
  // Computed or joined fields
  parent_name?: string;
  subcategories?: Category[];
}

export interface CategoryCreate {
  name: string;
  parent_id?: number | null;
  description?: string;
}

export type CategoryUpdate = Partial<CategoryCreate> & {
  id: number;
};
