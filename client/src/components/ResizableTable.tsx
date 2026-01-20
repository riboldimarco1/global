import { useRef, useCallback } from "react";
import { TableHead } from "@/components/ui/table";

interface ResizableHeaderProps {
  children: React.ReactNode;
  columnKey: string;
  width: number;
  onResize: (columnKey: string, delta: number) => void;
  className?: string;
  isLast?: boolean;
}

export function ResizableHeader({ children, columnKey, width, onResize, className = "", isLast = false }: ResizableHeaderProps) {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX.current;
      onResize(columnKey, delta - (width - startWidth.current));
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
      className={`relative select-none ${className}`} 
      style={{ width, minWidth: 40 }}
    >
      <div className="truncate pr-2">{children}</div>
      {!isLast && (
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50"
          onMouseDown={handleMouseDown}
        />
      )}
    </TableHead>
  );
}
