import { useState, useRef, useEffect, ReactNode } from "react";
import { X, LogOut, Minus, Square, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized?: boolean;
  maximized?: boolean;
}

interface FloatingWindowProps {
  id: string;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  defaultPosition?: Partial<WindowPosition>;
  minWidth?: number;
  minHeight?: number;
  onClose?: () => void;
  onLogout?: () => void;
  showLogout?: boolean;
  zIndex: number;
  onFocus: () => void;
  onPositionChange?: (position: WindowPosition) => void;
  className?: string;
  headerClassName?: string;
  resizable?: boolean;
}

export function FloatingWindow({
  id,
  title,
  children,
  icon,
  defaultPosition = {},
  minWidth = 300,
  minHeight = 200,
  onClose,
  onLogout,
  showLogout = false,
  zIndex,
  onFocus,
  onPositionChange,
  className,
  headerClassName,
  resizable = true,
}: FloatingWindowProps) {
  const [position, setPosition] = useState<WindowPosition>(() => {
    const saved = localStorage.getItem(`window-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure width and height are respected if they were saved
        return {
          ...parsed,
          width: parsed.width ?? defaultPosition.width ?? 400,
          height: parsed.height ?? defaultPosition.height ?? 300,
        };
      } catch {}
    }
    return {
      x: defaultPosition.x ?? 100,
      y: defaultPosition.y ?? 100,
      width: defaultPosition.width ?? 400,
      height: defaultPosition.height ?? 300,
      minimized: false,
      maximized: false,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef(position);

  useEffect(() => {
    localStorage.setItem(`window-${id}`, JSON.stringify(position));
    if (onPositionChange) {
      onPositionChange(position);
    }
  }, [id, position, onPositionChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus();
    setIsDragging(true);
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    onFocus();
    setIsResizing(true);
    setResizeDirection(direction);
    lastPositionRef.current = { ...position };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !position.maximized) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
        setPosition(p => ({ ...p, x: newX, y: newY }));
      }
      
      if (isResizing && !position.maximized) {
        setPosition(p => {
          let newWidth = p.width;
          let newHeight = p.height;
          let newX = p.x;
          let newY = p.y;

          if (resizeDirection.includes('e')) {
            newWidth = Math.max(minWidth, Math.min(window.innerWidth - p.x, e.clientX - p.x));
          }
          if (resizeDirection.includes('w')) {
            const mouseX = Math.max(0, e.clientX);
            const diff = p.x - mouseX;
            const potentialWidth = p.width + diff;
            if (potentialWidth >= minWidth) {
              newWidth = potentialWidth;
              newX = mouseX;
            }
          }
          if (resizeDirection.includes('s')) {
            newHeight = Math.max(minHeight, Math.min(window.innerHeight - p.y, e.clientY - p.y));
          }
          if (resizeDirection.includes('n')) {
            const mouseY = Math.max(0, e.clientY);
            const diff = p.y - mouseY;
            const potentialHeight = p.height + diff;
            if (potentialHeight >= minHeight) {
              newHeight = potentialHeight;
              newY = mouseY;
            }
          }

          newX = Math.max(0, newX);
          newY = Math.max(0, newY);

          return { ...p, x: newX, y: newY, width: newWidth, height: newHeight };
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection("");
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeDirection, position.maximized, minWidth, minHeight]);

  const toggleMaximize = () => {
    if (position.maximized) {
      const saved = localStorage.getItem(`window-${id}-pre-max`);
      if (saved) {
        const preMax = JSON.parse(saved);
        setPosition({ ...preMax, maximized: false, minimized: false });
      } else {
        setPosition(p => ({ ...p, maximized: false }));
      }
    } else {
      localStorage.setItem(`window-${id}-pre-max`, JSON.stringify(position));
      setPosition({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        maximized: true,
        minimized: false,
      });
    }
  };

  const toggleMinimize = () => {
    setPosition(p => ({ ...p, minimized: !p.minimized }));
  };

  if (position.minimized) {
    return (
      <div
        ref={windowRef}
        className="fixed bg-card border shadow-lg rounded-md cursor-pointer hover-elevate"
        style={{
          left: position.x,
          top: position.y,
          zIndex,
          width: 200,
        }}
        onClick={() => {
          onFocus();
          toggleMinimize();
        }}
        data-testid={`window-${id}-minimized`}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {icon}
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className={cn(
        "fixed bg-card border shadow-xl rounded-md overflow-hidden flex flex-col",
        isDragging && "cursor-grabbing select-none",
        className
      )}
      style={{
        left: position.maximized ? 0 : position.x,
        top: position.maximized ? 0 : position.y,
        width: position.maximized ? '100vw' : position.width,
        height: position.maximized ? '100vh' : position.height,
        zIndex,
      }}
      onClick={onFocus}
      data-testid={`window-${id}`}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border-b cursor-grab select-none shrink-0",
          isDragging && "cursor-grabbing",
          headerClassName
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-medium text-sm truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {showLogout && onLogout && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              title="Cerrar sesión"
              data-testid={`window-${id}-logout`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
            title="Minimizar"
            data-testid={`window-${id}-minimize`}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize();
            }}
            title={position.maximized ? "Restaurar" : "Maximizar"}
            data-testid={`window-${id}-maximize`}
          >
            {position.maximized ? <Square className="h-3 w-3" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Cerrar"
              data-testid={`window-${id}-close`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {resizable && !position.maximized && (
        <>
          <div
            className="absolute top-0 left-0 w-2 h-full cursor-ew-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
          />
          <div
            className="absolute top-0 right-0 w-2 h-full cursor-ew-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
          />
          <div
            className="absolute top-0 left-0 w-full h-2 cursor-ns-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
          />
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
        </>
      )}
    </div>
  );
}
