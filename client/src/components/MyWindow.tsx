import { useState, useRef, useEffect, useCallback, cloneElement, isValidElement, Children } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, Minimize2, Maximize2, X, Loader2 } from "lucide-react";

interface MyWindowProps {
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
  autoLoadTable?: boolean;
  queryParams?: Record<string, string>;
  limit?: number;
  onEdit?: (row: Record<string, any>) => void;
  onCopy?: (row: Record<string, any>) => void;
  onDelete?: (row: Record<string, any>) => void;
  onSaveNew?: (data: Record<string, any>) => void;
  refreshTrigger?: number;
}

export default function MyWindow({ 
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
  borderColor = "border-primary/40",
  autoLoadTable = false,
  queryParams = {},
  limit = 100,
  onEdit,
  onCopy,
  onDelete,
  onSaveNew,
  refreshTrigger = 0
}: MyWindowProps) {
  const [tableData, setTableData] = useState<Record<string, any>[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const queryParamsKey = JSON.stringify(queryParams);
  
  const fetchData = useCallback(async (currentOffset: number, isInitial: boolean, silent: boolean = false) => {
    const params = new URLSearchParams({ 
      ...queryParams, 
      limit: String(limit),
      offset: String(currentOffset)
    });
    const url = `/api/${id}?${params.toString()}`;
    
    try {
      if (!silent) {
        if (isInitial) {
          setIsLoadingTable(true);
        } else {
          setIsLoadingMore(true);
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al cargar datos");
      const result = await response.json();
      
      const newData = Array.isArray(result) ? result : (result.data || []);
      const moreAvailable = Array.isArray(result) ? newData.length >= limit : result.hasMore;
      
      if (isInitial) {
        setTableData(newData);
      } else {
        setTableData(prev => [...prev, ...newData]);
      }
      
      if (!moreAvailable) {
        setHasMore(false);
      }
      
      return newData.length;
    } catch (error) {
      console.error("Error fetching data:", error);
      return 0;
    } finally {
      setIsLoadingTable(false);
      setIsLoadingMore(false);
    }
  }, [id, queryParamsKey, limit]);
  
  useEffect(() => {
    if (!autoLoadTable) return;
    
    setTableData([]);
    setOffset(0);
    setHasMore(true);
    setBackgroundLoaded(false);
    fetchData(0, true);
  }, [autoLoadTable, queryParamsKey, fetchData]);
  
  useEffect(() => {
    if (refreshTrigger > 0 && autoLoadTable) {
      setOffset(0);
      setHasMore(true);
      setBackgroundLoaded(false);
      fetchData(0, true, true);
    }
  }, [refreshTrigger, fetchData, autoLoadTable]);
  
  useEffect(() => {
    if (!autoLoadTable || isLoadingTable || isLoadingMore || !hasMore || backgroundLoaded) return;
    if (tableData.length === limit) {
      setBackgroundLoaded(true);
      const timer = setTimeout(() => {
        fetchData(limit, false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tableData.length, autoLoadTable, isLoadingTable, isLoadingMore, hasMore, backgroundLoaded, limit, fetchData]);
  
  const loadMoreData = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    fetchData(tableData.length, false);
  }, [isLoadingMore, hasMore, tableData.length, fetchData]);
  const getViewport = () => {
    if (typeof window === 'undefined') return { width: 1024, height: 768 };
    return { width: window.innerWidth, height: window.innerHeight };
  };
  
  const [viewport, setViewport] = useState(getViewport);
  const isMobile = viewport.width < 768;
  
  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getStoredState = () => {
    if (typeof window === 'undefined') return null;
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
    if (isMaximized || isMobile) return;
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
    if (isMaximized || isMobile) return;
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
      setSize({ width: viewport.width, height: viewport.height });
      setIsMaximized(true);
    }
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const HEADER_OFFSET = 60;
  const mobileWidth = viewport.width;
  const mobileHeight = viewport.height - HEADER_OFFSET;

  return (
    <div
      ref={windowRef}
      className={`fixed select-none ${className}`}
      style={{
        left: isMobile ? 0 : position.x,
        top: isMobile ? HEADER_OFFSET : position.y,
        width: isMobile ? mobileWidth : size.width,
        height: isMinimized ? "auto" : (isMobile ? mobileHeight : size.height),
        zIndex,
      }}
      onMouseDown={onFocus}
      data-testid="my-window"
    >
      <Card className={`h-full flex flex-col shadow-xl border-2 ${borderColor} bg-background`}>
        <CardHeader 
          className={`py-2 px-3 flex flex-row items-center justify-between gap-2 border-b bg-muted/30 shrink-0 ${isMobile ? 'cursor-default' : 'cursor-move'}`}
          onMouseDown={handleDragStart}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {!isMobile && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                {icon}
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-indigo-600 text-white text-xs">
              MyWindow
            </TooltipContent>
          </Tooltip>
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
          <CardContent className="flex-1 p-0 overflow-auto relative">
            {autoLoadTable && isLoadingTable && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {autoLoadTable && isLoadingMore && (
              <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-muted/90 px-2 py-1 rounded-md z-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Cargando más...</span>
              </div>
            )}
            {autoLoadTable 
              ? Children.map(children, child => 
                  isValidElement(child) 
                    ? cloneElement(child as React.ReactElement<any>, { 
                        tableData, 
                        isLoading: isLoadingTable,
                        isLoadingMore,
                        totalLoaded: tableData.length,
                        hasMore,
                        onLoadMore: loadMoreData,
                        onEdit,
                        onCopy,
                        onDelete,
                        onSaveNew
                      })
                    : child
                )
              : children
            }
          </CardContent>
        )}
        
        {!isMaximized && !isMinimized && !isMobile && (
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
