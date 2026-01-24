import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { categoriesService } from "../../../services/categories";
import { CategoryCreate } from "../../../types/category";
import { Button } from "../../../components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../../../components/ui/resizable";
import { CategoryTreeView } from "../components/CategoryTreeView";
import { CategoryEditPanel } from "../components/CategoryEditPanel";

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  // Selection and edit state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch all categories
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.getAllWithCount,
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 seconds - categories change infrequently
  });

  // Find selected category
  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId) || null
    : null;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CategoryCreate) => categoriesService.create(data),
    onSuccess: (newCategory) => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSelectedCategoryId(newCategory.id);
      setIsCreating(false);
      setNewCategoryParentId(null);
      toast.success("Категория создана");
    },
    onError: (error: Error) => {
      setMutationError(error.message);
      toast.error(`Ошибка создания: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryCreate> }) =>
      categoriesService.update(id, data),
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Категория обновлена");
    },
    onError: (error: Error) => {
      setMutationError(error.message);
      toast.error(`Ошибка обновления: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSelectedCategoryId(null);
      toast.success("Категория удалена");
    },
    onError: (error: Error) => {
      setMutationError(error.message);
      toast.error(`Ошибка удаления: ${error.message}`);
    },
  });

  // Handlers
  const handleSelect = (id: number) => {
    setMutationError(null);
    setSelectedCategoryId(id);
    setIsCreating(false);
    setNewCategoryParentId(null);
  };

  const handleAddChild = (parentId: number | null) => {
    setMutationError(null);
    setSelectedCategoryId(null);
    setIsCreating(true);
    setNewCategoryParentId(parentId);
  };

  const handleSave = (data: CategoryCreate & { id?: number }) => {
    if (data.id) {
      // Update
      const { id, ...updateData } = data;
      updateMutation.mutate({ id, data: updateData });
    } else {
      // Create
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (selectedCategoryId) {
      deleteMutation.mutate(selectedCategoryId);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setNewCategoryParentId(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка категорий...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-destructive">Ошибка загрузки категорий</div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold tracking-tight">Категории</h1>
      </div>

      {/* Split View */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Tree */}
        <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
          <div className="h-full border-r bg-muted/30">
            <CategoryTreeView
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={handleSelect}
              onAddChild={handleAddChild}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Edit */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <CategoryEditPanel
            category={selectedCategory}
            isCreating={isCreating}
            parentId={newCategoryParentId}
            allCategories={categories}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={handleCancel}
            isLoading={
              createMutation.isPending ||
              updateMutation.isPending ||
              deleteMutation.isPending
            }
            error={mutationError}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
