import { useQuery } from '@tanstack/react-query';
import { categoriesService } from '@/services/categories';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Search, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';

export default function CategoriesPage() {
  const [search, setSearch] = useState('');

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getAll
  });

  const filteredCategories = categories?.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка категорий...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Ошибка загрузки данных</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Поиск категорий..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Новая категория
        </Button>
      </div>

      <div className="border rounded-md flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Родительская категория</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="w-[100px] text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories?.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell>
                  {cat.parent_id ? (
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FolderOpen className="h-4 w-4 text-primary" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {cat.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {/* Since API might just return parent_id, we would need to look it up or backend needs to send parent_name.
                      Assuming basic list for now. */}
                  {cat.parent_id ? (categories?.find(p => p.id === cat.parent_id)?.name || cat.parent_id) : '-'}
                </TableCell>
                <TableCell className="max-w-[300px] truncate text-muted-foreground">
                  {cat.description}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCategories?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Категории не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
