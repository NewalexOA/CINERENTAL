import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1 border-t">
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <span>Всего: {totalItems}</span>
        <div className="flex items-center space-x-1">
          <span>Показать по:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
                onPageSizeChange(Number(val));
                onPageChange(1); // Reset to first page on size change
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 w-[60px] text-xs">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-xs text-muted-foreground">
          Стр. {currentPage} из {totalPages || 1}
        </span>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || disabled}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || disabled}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
