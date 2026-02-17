import { useState, useRef, useEffect, useCallback, useMemo, Component, type ErrorInfo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, Minimize2, Maximize2, X, Loader2, RefreshCw, ExternalLink, Monitor, Home, GraduationCap, AlertTriangle } from "lucide-react";
import { TableDataContext, type TableDataContextType, type CellFilter } from "@/contexts/TableDataContext";
import { useDebugContext } from "@/contexts/DebugContext";
import { MyTutorial } from "@/components/MyTutorial";
import { useStyleMode } from "@/contexts/StyleModeContext";

class WindowErrorBoundary extends Component<{ children: ReactNode; windowTitle: string }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; windowTitle: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[MyWindow Error: ${this.props.windowTitle}]`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
          <AlertTriangle className="h-8 w-8 text-red-800 dark:text-red-300" />
          <div className="text-sm font-bold text-red-800 dark:text-red-300">Error al cargar el módulo</div>
          <div className="text-xs text-muted-foreground text-center max-w-md break-all">{this.state.error?.message}</div>
          <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false, error: null })} data-testid="button-retry-module">
            Reintentar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  initialLimit?: number;
  loadMoreLimit?: number;
  onEdit?: (row: Record<string, any>) => void;
  onCopy?: (row: Record<string, any>) => void;
  onDelete?: (row: Record<string, any>) => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
  canMinimize?: boolean;
  canClose?: boolean;
  minimizedIndex?: number;
  popoutUrl?: string;
  isStandalone?: boolean;
  tutorialId?: string;
  startMinimized?: boolean;
  minimizedRight?: boolean;
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
  initialLimit = 100,
  loadMoreLimit = 500,
  onEdit,
  onCopy,
  onDelete,
  onSaveNew,
  canMinimize = true,
  canClose = false,
  minimizedIndex = 0,
  popoutUrl,
  isStandalone = false,
  tutorialId,
  startMinimized,
  minimizedRight = false
}: MyWindowProps) {
  const [, navigate] = useLocation();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";
  const [showTutorial, setShowTutorial] = useState(false);
  const [tableData, setTableData] = useState<Record<string, any>[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [cellFilters, setCellFilters] = useState<CellFilter[]>([]);
  const queryParamsKey = JSON.stringify(queryParams);
  const cellFiltersKey = JSON.stringify(cellFilters);
  
  const addCellFilter = useCallback((column: string, value: string) => {
    setCellFilters(prev => {
      const existing = prev.find(f => f.column === column && f.value === value);
      if (existing) return prev;
      return [...prev, { column, value }];
    });
  }, []);
  
  const clearCellFilters = useCallback(() => {
    setCellFilters([]);
  }, []);
  
  const fetchData = useCallback(async (currentOffset: number, isInitial: boolean) => {
    const currentLimit = isInitial ? initialLimit : loadMoreLimit;
    const params = new URLSearchParams({ 
      ...queryParams, 
      limit: String(currentLimit),
      offset: String(currentOffset)
    });
    cellFilters.forEach(f => {
      params.append(f.column, f.value);
    });
    const url = `/api/${id}?${params.toString()}`;
    
    try {
      if (isInitial) {
        setIsLoadingTable(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al cargar datos");
      const result = await response.json();
      
      const newData = Array.isArray(result) ? result : (result.data || []);
      const moreAvailable = Array.isArray(result) ? newData.length >= currentLimit : result.hasMore;
      const serverTotal = !Array.isArray(result) ? result.total : undefined;
      
      if (isInitial) {
        setTableData(newData);
        setTotalCount(serverTotal);
      } else {
        // Evitar duplicados al cargar más datos
        setTableData(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewData = newData.filter((item: Record<string, any>) => !existingIds.has(item.id));
          return [...prev, ...uniqueNewData];
        });
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
  }, [id, queryParamsKey, cellFiltersKey, initialLimit, loadMoreLimit]);
  
  useEffect(() => {
    if (!autoLoadTable) return;
    
    setTableData([]);
    setOffset(0);
    setHasMore(true);
    setTotalCount(undefined);
    setBackgroundLoaded(false);
    fetchData(0, true);
  }, [autoLoadTable, queryParamsKey, cellFiltersKey, fetchData]);
  
  useEffect(() => {
    if (!autoLoadTable) return;
    
    const handleRealtimeRefresh = (event: CustomEvent<{ table: string }>) => {
      if (event.detail.table === id) {
        // Refrescar sin vaciar la tabla para evitar parpadeo
        setOffset(0);
        setHasMore(true);
        setBackgroundLoaded(false);
        fetchData(0, true);
      }
    };
    
    window.addEventListener("realtime:refresh", handleRealtimeRefresh as EventListener);
    
    return () => {
      window.removeEventListener("realtime:refresh", handleRealtimeRefresh as EventListener);
    };
  }, [autoLoadTable, id, fetchData]);
  
  const [wasEverVisible, setWasEverVisible] = useState(false);
  
  useEffect(() => {
    if (!autoLoadTable || isLoadingTable || isLoadingMore || !hasMore || backgroundLoaded || !wasEverVisible) return;
    if (tableData.length === initialLimit) {
      setBackgroundLoaded(true);
      const timer = setTimeout(() => {
        fetchData(initialLimit, false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tableData.length, autoLoadTable, isLoadingTable, isLoadingMore, hasMore, backgroundLoaded, initialLimit, fetchData, wasEverVisible]);
  
  const loadMoreData = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    fetchData(tableData.length, false);
  }, [isLoadingMore, hasMore, tableData.length, fetchData]);

  const handleRefresh = useCallback(async (newRecord?: Record<string, any>) => {
    if (newRecord) {
      setTableData(prev => {
        const existingIndex = prev.findIndex(item => item.id === newRecord.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newRecord;
          return updated;
        } else {
          return [newRecord, ...prev];
        }
      });
    } else {
      const refreshLimit = initialLimit + loadMoreLimit;
      try {
        const params = new URLSearchParams({
          ...queryParams,
          limit: String(refreshLimit),
          offset: "0"
        });
        cellFilters.forEach(f => {
          params.append(f.column, f.value);
        });
        const response = await fetch(`/api/${id}?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          const newData = Array.isArray(result) ? result : (result.data || []);
          const moreAvailable = Array.isArray(result) ? newData.length >= refreshLimit : result.hasMore;
          const serverTotal = !Array.isArray(result) ? result.total : undefined;
          setTableData(newData);
          setOffset(newData.length);
          setHasMore(moreAvailable);
          setTotalCount(serverTotal);
          setBackgroundLoaded(true);
        }
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    }
  }, [id, queryParams, cellFiltersKey, initialLimit, loadMoreLimit]);

  const wrappedOnDelete = useCallback(async (row: Record<string, any>) => {
    if (onDelete) {
      await onDelete(row);
    }
  }, [onDelete]);

  const wrappedOnSaveNew = useCallback((data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => {
    if (onSaveNew) {
      onSaveNew(data, (savedRecord) => {
        handleRefresh(savedRecord);
        if (onComplete) onComplete(savedRecord);
      });
    }
  }, [onSaveNew, handleRefresh]);

  const handleRemove = useCallback((recordId: string | number) => {
    setTableData(prev => prev.filter(item => item.id !== recordId));
  }, []);

  const tableDataContextValue = useMemo<TableDataContextType>(() => ({
    tableName: id,
    tableData,
    isLoading: isLoadingTable,
    isLoadingMore,
    hasMore,
    totalLoaded: tableData.length,
    totalCount,
    onLoadMore: loadMoreData,
    onRefresh: handleRefresh,
    onRemove: handleRemove,
    onEdit,
    onCopy,
    onDelete: onDelete ? wrappedOnDelete : undefined,
    onSaveNew: onSaveNew ? wrappedOnSaveNew : undefined,
    cellFilters,
    addCellFilter,
    clearCellFilters,
  }), [id, tableData, isLoadingTable, isLoadingMore, hasMore, totalCount, loadMoreData, handleRefresh, handleRemove, onEdit, onCopy, onDelete, onSaveNew, wrappedOnDelete, wrappedOnSaveNew, cellFilters, addCellFilter, clearCellFilters]);

  const { updateWindowDebug, removeWindowDebug, setActiveWindow } = useDebugContext();
  
  useEffect(() => {
    if (autoLoadTable) {
      updateWindowDebug({
        windowId: id,
        tableName: id,
        tableDataLength: tableData.length,
        hasMore,
        isLoading: isLoadingTable,
        isLoadingMore,
        totalLoaded: tableData.length
      });
    }
  }, [autoLoadTable, id, tableData.length, hasMore, isLoadingTable, isLoadingMore, updateWindowDebug]);

  useEffect(() => {
    return () => {
      if (autoLoadTable) {
        removeWindowDebug(id);
      }
    };
  }, [autoLoadTable, id, removeWindowDebug]);

  const handleFocusInternal = useCallback(() => {
    onFocus?.();
    if (autoLoadTable) {
      setActiveWindow(id);
    }
  }, [onFocus, autoLoadTable, id, setActiveWindow]);

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
  const [isMinimized, setIsMinimized] = useState(() => {
    if (startMinimized === false) return false;
    if (storedState?.isMinimized !== undefined) return storedState.isMinimized;
    return startMinimized !== undefined ? startMinimized : (canMinimize ? true : false);
  });
  const [isMaximized, setIsMaximized] = useState(storedState?.isMaximized || false);
  const [prevState, setPrevState] = useState(storedState?.prevState || { position: initialPosition, size: initialSize });
  
    
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const isMinimizedRef = useRef(isMinimized);
  const isMaximizedRef = useRef(isMaximized);
  const prevStateRef = useRef(prevState);

  useEffect(() => {
    positionRef.current = position;
    sizeRef.current = size;
    isMinimizedRef.current = isMinimized;
    isMaximizedRef.current = isMaximized;
    prevStateRef.current = prevState;
    const state = { position, size, isMinimized, isMaximized, prevState };
    localStorage.setItem(`window_state_${id}`, JSON.stringify(state));
    if (!isMinimized) {
      setWasEverVisible(true);
    }
  }, [id, position, size, isMinimized, isMaximized, prevState]);

  useEffect(() => {
    return () => {
      const state = { 
        position: positionRef.current, 
        size: sizeRef.current, 
        isMinimized: isMinimizedRef.current,
        isMaximized: isMaximizedRef.current, 
        prevState: prevStateRef.current 
      };
      localStorage.setItem(`window_state_${id}`, JSON.stringify(state));
    };
  }, [id]);

  useEffect(() => {
    const handleMinimizeAll = () => {
      if (canMinimize && !isMinimized) {
        const savePrevState = isMaximized ? prevState : { position, size };
        setPrevState(savePrevState);
        setIsMinimized(true);
        setIsMaximized(false);
        const state = { position, size, isMinimized: true, isMaximized: false, prevState: savePrevState };
        localStorage.setItem(`window_state_${id}`, JSON.stringify(state));
      }
    };
    window.addEventListener("minimizeAllWindows", handleMinimizeAll);
    return () => window.removeEventListener("minimizeAllWindows", handleMinimizeAll);
  }, [canMinimize, isMinimized, isMaximized, position, size, prevState, id]);

  useEffect(() => {
    const handleActivateWindow = (event: CustomEvent<{ windowId: string }>) => {
      if (event.detail.windowId === id) {
        console.log(`activateWindow recibido para ${id}, isMinimized=${isMinimizedRef.current}`);
        // Si está minimizado, restaurar la ventana
        if (isMinimizedRef.current) {
          const storedState = localStorage.getItem(`window_state_${id}`);
          const parsed = storedState ? JSON.parse(storedState) : null;
          const restoredPosition = parsed?.prevState?.position || positionRef.current;
          const restoredSize = parsed?.prevState?.size || sizeRef.current;
          setPosition(restoredPosition);
          setSize(restoredSize);
          setIsMinimized(false);
          const state = { position: restoredPosition, size: restoredSize, isMinimized: false, prevState: parsed?.prevState };
          localStorage.setItem(`window_state_${id}`, JSON.stringify(state));
          console.log(`Ventana ${id} restaurada de minimizado`);
        }
        // Usar handleFocusInternal para dar foco Y activar la ventana correctamente
        handleFocusInternal();
        console.log(`Ventana ${id} activada via handleFocusInternal`);
      }
    };
    window.addEventListener("activateWindow", handleActivateWindow as EventListener);
    return () => window.removeEventListener("activateWindow", handleActivateWindow as EventListener);
  }, [id, handleFocusInternal]);

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
    if (isMinimized || isMobile || isMaximized) return;
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
    if (isMinimized || isMobile || isMaximized) return;
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

  const toggleMinimize = () => {
    if (isMinimized) {
      const restoredPosition = prevState.position;
      const restoredSize = prevState.size;
      setPosition(restoredPosition);
      setSize(restoredSize);
      setIsMinimized(false);
      setIsMaximized(false);
      const state = { position: restoredPosition, size: restoredSize, isMinimized: false, isMaximized: false, prevState };
      localStorage.setItem(`window_state_${id}`, JSON.stringify(state));
    } else {
      const savePrevState = isMaximized ? prevState : { position, size };
      setPrevState(savePrevState);
      setIsMinimized(true);
      setIsMaximized(false);
      const state = { position, size, isMinimized: true, isMaximized: false, prevState: savePrevState };
      localStorage.setItem(`window_state_${id}`, JSON.stringify(state));
    }
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
  };

  const HEADER_OFFSET = 60;
  const mobileWidth = viewport.width;
  const mobileHeight = viewport.height - HEADER_OFFSET;

  // Posición del icono minimizado en la esquina inferior izquierda
  const MINIMIZED_ICON_WIDTH = 60;  // 1.5x del original (40)
  const MINIMIZED_ICON_HEIGHT = 40;
  const MINIMIZED_SPACING = 8;

  // Obtener las primeras 3 letras del título para el icono minimizado
  const shortTitle = title.substring(0, 3).toUpperCase();

  // Calcular posición horizontal del icono minimizado
  const minimizedLeft = MINIMIZED_SPACING + minimizedIndex * (MINIMIZED_ICON_WIDTH + MINIMIZED_SPACING);

  if (isMinimized) {
    const taskbarContainer = document.getElementById("taskbar");
    
    const minimizedButton = (
      <div
        ref={windowRef}
        className={className}
        style={{
          width: MINIMIZED_ICON_WIDTH,
          height: MINIMIZED_ICON_HEIGHT,
          order: minimizedIndex,
        }}
        onMouseDown={handleFocusInternal}
        data-testid="my-window"
        data-minimized="true"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`w-full h-full flex items-center justify-center gap-1 rounded-md ${windowStyle} ${borderColor} bg-card cursor-pointer hover-elevate`}
              onClick={toggleMinimize}
              data-testid={`minimized-icon-${id}`}
            >
              {icon}
              <span className="text-xs font-bold">{shortTitle}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
            {title}
          </TooltipContent>
        </Tooltip>
      </div>
    );

    if (taskbarContainer) {
      return createPortal(minimizedButton, taskbarContainer);
    }

    return (
      <div
        ref={windowRef}
        className={`fixed ${className}`}
        style={{
          left: minimizedLeft,
          bottom: MINIMIZED_SPACING,
          width: MINIMIZED_ICON_WIDTH,
          height: MINIMIZED_ICON_HEIGHT,
          zIndex,
        }}
        onMouseDown={handleFocusInternal}
        data-testid="my-window"
        data-minimized="true"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`w-full h-full flex items-center justify-center gap-1 rounded-md ${windowStyle} ${borderColor} bg-card cursor-pointer hover-elevate`}
              onClick={toggleMinimize}
              data-testid={`minimized-icon-${id}`}
            >
              {icon}
              <span className="text-xs font-bold">{shortTitle}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
            {title}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Modo standalone: pantalla completa sin arrastre ni minimizar
  if (isStandalone) {
    return (
      <div
        ref={windowRef}
        className="h-full w-full"
        data-testid="my-window-standalone"
      >
        <Card className={`h-full flex flex-col ${windowStyle} ${borderColor} bg-card`}>
          <CardHeader className="py-2 px-3 flex flex-row items-center justify-between gap-2 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => navigate("/")}
                    data-testid="button-home"
                  >
                    <span className="p-1 rounded-md border-2 bg-teal-600 border-teal-700 flex items-center justify-center">
                      <Home className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-teal-600 text-white text-xs">
                  Menú principal
                </TooltipContent>
              </Tooltip>
              {tutorialId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => setShowTutorial(true)}
                      data-testid="button-tutorial"
                    >
                      <span className="p-1 rounded-md border-2 bg-sky-600 border-sky-700 flex items-center justify-center">
                        <GraduationCap className="h-4 w-4 text-white" />
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-sky-600 text-white text-xs">
                    Tutorial del módulo
                  </TooltipContent>
                </Tooltip>
              )}
              {autoLoadTable && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={handleRefresh}
                      data-testid="button-refresh"
                    >
                      <span className="p-1 rounded-md border-2 bg-blue-600 border-blue-700 flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-white" />
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-blue-600 text-white text-xs">
                    Recargar datos
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={toggleMaximize}
                    data-testid="button-maximize"
                  >
                    <span className="p-1 rounded-md border-2 bg-green-600 border-green-700 flex items-center justify-center">
                      <Maximize2 className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-green-600 text-white text-xs">
                  {isMaximized ? "Restaurar tamaño" : "Pantalla completa"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={() => {
                      const externalWindows = JSON.parse(localStorage.getItem("external_windows") || "{}");
                      delete externalWindows[id];
                      localStorage.setItem("external_windows", JSON.stringify(externalWindows));
                      window.close();
                    }}
                    data-testid="button-return-internal"
                  >
                    <span className="p-1 rounded-md border-2 bg-orange-600 border-orange-700 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-orange-600 text-white text-xs">
                  Volver a modo interno
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          
          {tutorialId && (
            <MyTutorial 
              moduleId={tutorialId} 
              isOpen={showTutorial} 
              onClose={() => setShowTutorial(false)} 
            />
          )}
          
          <CardContent className="flex-1 p-0 overflow-auto relative">
            {autoLoadTable && isLoadingTable && tableData.length === 0 && (
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
            <WindowErrorBoundary windowTitle={title}>
            {autoLoadTable 
              ? (
                <TableDataContext.Provider value={tableDataContextValue}>
                  {children}
                </TableDataContext.Provider>
              )
              : children
            }
          </WindowErrorBoundary>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className={`fixed ${className}`}
      style={{
        left: isMobile ? 0 : position.x,
        top: isMobile ? HEADER_OFFSET : position.y,
        width: isMobile ? mobileWidth : size.width,
        height: isMobile ? mobileHeight : size.height,
        zIndex,
      }}
      onMouseDown={handleFocusInternal}
      data-testid="my-window"
    >
      <Card className={`h-full flex flex-col ${windowStyle} ${borderColor} bg-card`}>
        <CardHeader 
          className={`py-2 px-3 flex flex-row items-center justify-between gap-2 border-b bg-muted/30 shrink-0 ${!isMobile ? 'cursor-move' : ''}`}
          onMouseDown={!isMobile ? handleDragStart : undefined}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {!isMobile && (
                  <GripVertical 
                    className="h-4 w-4 text-muted-foreground" 
                  />
                )}
                {icon}
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-indigo-600 text-white text-xs">
              MyWindow
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    navigate("/");
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  data-testid="button-home"
                >
                  <span className="p-1 rounded-md border-2 bg-teal-600 border-teal-700 flex items-center justify-center">
                    <Home className="h-4 w-4 text-white" />
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-teal-600 text-white text-xs">
                Menú principal
              </TooltipContent>
            </Tooltip>
            {tutorialId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setShowTutorial(true); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-testid="button-tutorial"
                  >
                    <span className="p-1 rounded-md border-2 bg-sky-600 border-sky-700 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-sky-600 text-white text-xs">
                  Tutorial del módulo
                </TooltipContent>
              </Tooltip>
            )}
            {autoLoadTable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-testid="button-refresh"
                  >
                    <span className="p-1 rounded-md border-2 bg-blue-600 border-blue-700 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-blue-600 text-white text-xs">
                  Recargar datos
                </TooltipContent>
              </Tooltip>
            )}
            {popoutUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const externalWindows = JSON.parse(localStorage.getItem("external_windows") || "{}");
                      externalWindows[id] = true;
                      localStorage.setItem("external_windows", JSON.stringify(externalWindows));
                      const newWindow = window.open(popoutUrl, `${id}_popout`, 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,noopener,noreferrer');
                      if (newWindow) newWindow.opener = null;
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-testid="button-popout"
                  >
                    <span className="p-1 rounded-md border-2 bg-purple-600 border-purple-700 flex items-center justify-center">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-purple-600 text-white text-xs">
                  Abrir en ventana externa
                </TooltipContent>
              </Tooltip>
            )}
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-testid="button-maximize"
                  >
                    <span className="p-1 rounded-md border-2 bg-green-600 border-green-700 flex items-center justify-center">
                      <Maximize2 className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-green-600 text-white text-xs">
                  {isMaximized ? "Restaurar tamaño" : "Pantalla completa"}
                </TooltipContent>
              </Tooltip>
            )}
            {canMinimize && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-testid="button-minimize"
                  >
                    <span className="p-1 rounded-md border-2 bg-yellow-600 border-yellow-700 flex items-center justify-center">
                      <Minimize2 className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-yellow-600 text-white text-xs">
                  Minimizar ventana
                </TooltipContent>
              </Tooltip>
            )}
            {canClose && onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    data-testid="button-close"
                  >
                    <span className="p-1 rounded-md border-2 bg-red-600 border-red-700 flex items-center justify-center">
                      <X className="h-4 w-4 text-white" />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-red-600 text-white text-xs">
                  Cerrar ventana
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-auto relative">
          {autoLoadTable && isLoadingTable && tableData.length === 0 && (
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
          <WindowErrorBoundary windowTitle={title}>
            {autoLoadTable 
              ? (
                <TableDataContext.Provider value={tableDataContextValue}>
                  {children}
                </TableDataContext.Provider>
              )
              : children
            }
          </WindowErrorBoundary>
        </CardContent>
        
        {tutorialId && (
          <MyTutorial 
            moduleId={tutorialId} 
            isOpen={showTutorial} 
            onClose={() => setShowTutorial(false)} 
          />
        )}
        
        {!isMobile && !isMaximized && (
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
