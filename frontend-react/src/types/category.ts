export interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  description?: string;
  show_in_print_overview?: boolean;
  // Computed or joined fields
  parent_name?: string;
  subcategories?: Category[];
  equipment_count?: number;
}

export interface CategoryCreate {
  name: string;
  parent_id?: number | null;
  description?: string;
  show_in_print_overview?: boolean;
}

export type CategoryUpdate = Partial<CategoryCreate> & {
  id: number;
};
