import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Minimize2, Maximize2, X } from "lucide-react";

interface FloatingWindowProps {
  id: string;
  title: string;
  icon?: JSX.Element;
  children: JSX.Element | JSX.Element[];
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  onClose?: () => void;
  onFocus?: () => void;
  className?: string;
  zIndex?: number;
  borderColor?: string;
}

export default function FloatingWindow({ 
  id,
  title, 
  icon,
  children, 
  initialPosition = { x: 200, y: 60 },
  initialSize = { width: 900, height: 600 },
  minSize = { width: 400, height: 300 },
  maxSize = { width: 1400, height: 900 },
  onClose,
  onFocus,
  className = "",
  zIndex = 40,
  borderColor = "border-primary/40"
}: FloatingWindowProps) {
  const getStoredState = () => {
    try {
      const stored = localStorage.getItem(`window_state_${id}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Error loading window state", e);
    }
    return null;
  };

  const storedState = getStoredState();
  const [position, setPosition] = useState(storedState?.position || initialPosition);
  const [size, setSize] = useState(storedState?.size || initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(storedState?.isMinimized || false);
  const [isMaximized, setIsMaximized] = useState(storedState?.isMaximized || false);
  const [prevState, setPrevState] = useState(storedState?.prevState || { position: initialPosition, size: initialSize });
  
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Persistence effect
  useEffect(() => {
    const state = { position, size, isMinimized, isMaximized, prevState };
    localStorage.setItem(`window_state_${id}`, JSON.stringify(state));
  }, [id, position, size, isMinimized, isMaximized, prevState]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;
        setPosition({
          x: Math.max(0, dragRef.current.startPosX + deltaX),
          y: Math.max(0, dragRef.current.startPosY + deltaY),
        });
      }
      if (isResizing && resizeRef.current) {
        const deltaX = e.clientX - resizeRef.current.startX;
        const deltaY = e.clientY - resizeRef.current.startY;
        setSize({
          width: Math.max(minSize.width, Math.min(maxSize.width, resizeRef.current.startWidth + deltaX)),
          height: Math.max(minSize.height, Math.min(maxSize.height, resizeRef.current.startHeight + deltaY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      dragRef.current = null;
      resizeRef.current = null;
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, minSize, maxSize]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setPosition(prevState.position);
      setSize(prevState.size);
      setIsMaximized(false);
    } else {
      setPrevState({ position, size });
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div
      ref={windowRef}
      className={`fixed select-none ${className}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? "auto" : size.height,
        zIndex,
      }}
      onMouseDown={onFocus}
      data-testid="floating-window"
    >
      <Card className={`h-full flex flex-col shadow-xl border-2 ${borderColor} bg-background/98 backdrop-blur-sm`}>
        <CardHeader 
          className="py-2 px-3 cursor-move flex flex-row items-center justify-between gap-2 border-b bg-muted/30 shrink-0"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            {icon}
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
              onMouseDown={(e) => e.stopPropagation()}
              data-testid="button-minimize"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
              onMouseDown={(e) => e.stopPropagation()}
              data-testid="button-maximize"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            {onClose && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive" 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                onMouseDown={(e) => e.stopPropagation()}
                data-testid="button-close"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="flex-1 p-0 overflow-auto">
            {children}
          </CardContent>
        )}
        
        {!isMaximized && !isMinimized && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeStart}
            style={{ 
              background: "linear-gradient(135deg, transparent 50%, hsl(var(--muted-foreground)/0.4) 50%)",
              borderBottomRightRadius: "0.375rem"
            }}
          />
        )}
      </Card>
    </div>
  );
}
