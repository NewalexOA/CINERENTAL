import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useMemo, useCallback } from "react";
import { Pencil, Plus, Trash2, FolderTree, AlertCircle } from "lucide-react";
import { Category, CategoryCreate } from "../../../types/category";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Separator } from "../../../components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import {
  buildCategoryTree,
  getDescendantIds,
  CategoryTreeNode,
} from "../../../utils/category-utils";

// Constants
const ROOT_CATEGORY_VALUE = "__root__";

const schema = z.object({
  name: z.string().min(1, "Название обязательно").max(255, "Название слишком длинное"),
  description: z.string().max(1000, "Описание слишком длинное").optional(),
  parent_id: z.number().nullable().optional(),
  show_in_print_overview: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CategoryEditPanelProps {
  category: Category | null;
  isCreating: boolean;
  parentId: number | null;
  allCategories: Category[];
  onSave: (data: CategoryCreate & { id?: number }) => void;
  onDelete: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function CategoryEditPanel({
  category,
  isCreating,
  parentId,
  allCategories,
  onSave,
  onDelete,
  onCancel,
  isLoading,
  error,
}: CategoryEditPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: null,
      show_in_print_overview: true,
    },
  });

  // Build tree for hierarchical parent select (memoized first for reuse)
  const categoryTree = useMemo(
    () => buildCategoryTree(allCategories),
    [allCategories]
  );

  // Get excluded IDs for parent select (can't select self or descendants)
  // Uses pre-built tree to avoid redundant tree construction
  const excludedIds = useMemo(() => {
    if (!category) return [];
    return getDescendantIds(allCategories, category.id, categoryTree);
  }, [category, allCategories, categoryTree]);

  // Reset form when category changes
  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        description: category.description || "",
        parent_id: category.parent_id || null,
        show_in_print_overview: category.show_in_print_overview ?? true,
      });
    } else if (isCreating) {
      reset({
        name: "",
        description: "",
        parent_id: parentId,
        show_in_print_overview: true,
      });
    }
  }, [category, isCreating, parentId, reset]);

  const handleFormSubmit = (data: FormValues) => {
    if (category) {
      // Update existing
      onSave({
        id: category.id,
        name: data.name,
        description: data.description || undefined,
        parent_id: data.parent_id,
        show_in_print_overview: data.show_in_print_overview,
      });
    } else {
      // Create new
      onSave({
        name: data.name,
        description: data.description || undefined,
        parent_id: data.parent_id,
        show_in_print_overview: data.show_in_print_overview,
      });
    }
  };

  // Render hierarchical options for select (memoized)
  const renderSelectOptions = useCallback(
    (nodes: CategoryTreeNode[], depth: number = 0): React.ReactNode[] => {
      return nodes.flatMap((node) => {
        if (excludedIds.includes(node.id)) return [];

        const indent = "\u00A0\u00A0".repeat(depth);
        const prefix = depth > 0 ? "└─ " : "";

        return [
          <SelectItem key={node.id} value={node.id.toString()}>
            {indent}
            {prefix}
            {node.name}
          </SelectItem>,
          ...renderSelectOptions(node.children, depth + 1),
        ];
      });
    },
    [excludedIds]
  );

  // Empty state
  if (!category && !isCreating) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FolderTree className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Выберите категорию</p>
        <p className="text-sm">для просмотра и редактирования</p>
      </div>
    );
  }

  const currentParentId = watch("parent_id");
  const parentCategory = currentParentId
    ? allCategories.find((c) => c.id === currentParentId)
    : null;

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          {isCreating ? (
            <>
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {parentId ? "Новая подкатегория" : "Новая категория"}
              </h2>
            </>
          ) : (
            <>
              <Pencil className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Редактирование</h2>
            </>
          )}
        </div>

        {/* Server error */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" aria-busy={isLoading}>
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Введите название категории"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Описание категории (необязательно)"
              rows={3}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <p id="description-error" role="alert" className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Parent category */}
          <div className="space-y-2">
            <Label>Родительская категория</Label>
            <Controller
              control={control}
              name="parent_id"
              render={({ field }) => (
                <Select
                  value={field.value?.toString() || ROOT_CATEGORY_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === ROOT_CATEGORY_VALUE ? null : parseInt(value, 10))
                  }
                >
                  <SelectTrigger aria-label="Выберите родительскую категорию">
                    <SelectValue placeholder="Корневая категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_CATEGORY_VALUE}>Корневая категория</SelectItem>
                    <Separator className="my-1" />
                    {renderSelectOptions(categoryTree)}
                  </SelectContent>
                </Select>
              )}
            />
            {parentCategory && (
              <p className="text-xs text-muted-foreground">
                Будет подкатегорией "{parentCategory.name}"
              </p>
            )}
          </div>

          {/* Show in print */}
          <div className="flex items-center space-x-2">
            <Controller
              control={control}
              name="show_in_print_overview"
              render={({ field }) => (
                <Checkbox
                  id="show_in_print_overview"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="show_in_print_overview" className="font-normal">
              Отображать как заголовок в печатной форме
            </Label>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {isCreating ? "Создать" : "Сохранить"}
            </Button>

            {isCreating && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  onCancel();
                }}
              >
                Отмена
              </Button>
            )}

            {category && !isCreating && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="ml-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Вы уверены, что хотите удалить категорию "{category.name}"?
                      {category.equipment_count && category.equipment_count > 0 && (
                        <span className="block mt-2 text-destructive font-medium">
                          В этой категории {category.equipment_count} единиц
                          оборудования!
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      disabled={isLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Category info */}
          {category && !isCreating && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>ID: {category.id}</p>
                {category.equipment_count !== undefined && (
                  <p>Оборудования: {category.equipment_count}</p>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </ScrollArea>
  );
}
