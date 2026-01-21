import { useRef, useCallback } from "react";
import { TableHead } from "@/components/ui/table";

interface ResizableHeaderProps {
  children: React.ReactNode;
  columnKey: string;
  width: number;
  onResize: (columnKey: string, newWidth: number) => void;
  className?: string;
  isLast?: boolean;
}

export function ResizableHeader({ children, columnKey, width, onResize, className = "", isLast = false }: ResizableHeaderProps) {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startWidth.current = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX.current;
      const newWidth = startWidth.current + delta;
      onResize(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [columnKey, width, onResize]);

  return (
    <TableHead 
      className={`relative select-none border-r last:border-r-0 border-border/40 bg-muted/50 ${className}`} 
      style={{ width, minWidth: 40 }}
    >
      <div className="truncate pr-4">{children}</div>
      {!isLast && (
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border/20 hover:bg-primary/40 active:bg-primary transition-colors z-10"
          onMouseDown={handleMouseDown}
          data-testid={`resize-handle-${columnKey}`}
        />
      )}
    </TableHead>
  );
}
