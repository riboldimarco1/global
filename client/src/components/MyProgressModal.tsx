import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface ProgressState {
  isOpen: boolean;
  title: string;
  current: number;
  total: number;
  currentItem: string;
  log: string[];
  status: "processing" | "completed" | "error";
  errorMessage?: string;
}

interface MyProgressContextType {
  showProgress: (options: { title: string; total: number }) => void;
  updateProgress: (options: { current: number; currentItem: string; logLine?: string }) => void;
  completeProgress: (options?: { title?: string; log?: string[] }) => void;
  errorProgress: (message: string) => void;
  closeProgress: () => void;
  isProgressOpen: boolean;
}

const MyProgressContext = createContext<MyProgressContextType | null>(null);

export function useMyProgress() {
  const context = useContext(MyProgressContext);
  if (!context) {
    throw new Error("useMyProgress must be used within MyProgressProvider");
  }
  return context;
}

export function MyProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>({
    isOpen: false,
    title: "",
    current: 0,
    total: 0,
    currentItem: "",
    log: [],
    status: "processing"
  });
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  useEffect(() => {
    const saved = localStorage.getItem("myprogress_position");
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        setPosition(pos);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (state.isOpen && modalRef.current) {
      const saved = localStorage.getItem("myprogress_position");
      if (!saved) {
        const rect = modalRef.current.getBoundingClientRect();
        const x = (window.innerWidth - rect.width) / 2;
        const y = (window.innerHeight - rect.height) / 3;
        setPosition({ x, y });
      }
    }
  }, [state.isOpen]);

  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem("myprogress_position", JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.log]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const showProgress = useCallback((options: { title: string; total: number }) => {
    setState({
      isOpen: true,
      title: options.title,
      current: 0,
      total: options.total,
      currentItem: "Iniciando...",
      log: [],
      status: "processing"
    });
  }, []);

  const updateProgress = useCallback((options: { current: number; currentItem: string; logLine?: string }) => {
    setState(prev => ({
      ...prev,
      current: options.current,
      currentItem: options.currentItem,
      log: options.logLine ? [...prev.log, options.logLine] : prev.log
    }));
  }, []);

  const completeProgress = useCallback((options?: { title?: string; log?: string[] }) => {
    setState(prev => ({
      ...prev,
      status: "completed",
      title: options?.title || prev.title,
      current: prev.total,
      currentItem: "Completado",
      log: options?.log || prev.log
    }));
  }, []);

  const errorProgress = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      status: "error",
      errorMessage: message
    }));
  }, []);

  const closeProgress = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const percentage = state.total > 0 ? Math.round((state.current / state.total) * 100) : 0;

  return (
    <MyProgressContext.Provider value={{ 
      showProgress, 
      updateProgress, 
      completeProgress, 
      errorProgress, 
      closeProgress,
      isProgressOpen: state.isOpen
    }}>
      {children}
      
      {state.isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998]"
          data-testid="myprogress-overlay"
        >
          <div
            ref={modalRef}
            className={`absolute bg-card ${windowStyle} rounded-lg shadow-2xl w-[420px] max-w-[90vw] ${
              state.status === "completed" ? "border-green-500" :
              state.status === "error" ? "border-red-500" :
              "border-blue-500"
            }`}
            style={{
              left: position.x,
              top: position.y,
              cursor: isDragging ? "grabbing" : "default"
            }}
            data-testid="myprogress-modal"
          >
            <div 
              className={`flex items-center justify-between gap-3 px-4 py-3 border-b rounded-t-lg cursor-move ${
                state.status === "completed" ? "border-green-500/30 bg-green-500/10" :
                state.status === "error" ? "border-red-500/30 bg-red-500/10" :
                "border-blue-500/30 bg-blue-500/10"
              }`}
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center gap-2">
                {state.status === "processing" && (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                )}
                {state.status === "completed" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {state.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-semibold ${
                  state.status === "completed" ? "text-green-600 dark:text-green-400" :
                  state.status === "error" ? "text-red-600 dark:text-red-400" :
                  "text-blue-600 dark:text-blue-400"
                }`}>
                  {state.title}
                </span>
              </div>
              {state.status !== "processing" && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={closeProgress}
                  className="h-6 w-6"
                  data-testid="myprogress-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="px-4 py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-medium">{state.current} / {state.total} ({percentage}%)</span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Procesando:</span>
                <span className="font-medium truncate flex-1">{state.currentItem}</span>
              </div>

              {state.log.length > 0 && (
                <div 
                  ref={logRef}
                  className="bg-muted/50 rounded-md p-3 max-h-[200px] overflow-y-auto text-xs font-mono space-y-1"
                >
                  {state.log.map((line, i) => (
                    <div key={i} className="text-muted-foreground">{line}</div>
                  ))}
                </div>
              )}

              {state.status === "error" && state.errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 text-sm text-red-600 dark:text-red-400">
                  {state.errorMessage}
                </div>
              )}
            </div>
            
            {state.status !== "processing" && (
              <div className="flex justify-end px-4 py-3 border-t border-muted bg-muted/30 rounded-b-lg">
                <Button 
                  size="sm" 
                  variant={state.status === "completed" ? "default" : "outline"}
                  onClick={closeProgress}
                  data-testid="myprogress-ok"
                >
                  Aceptar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </MyProgressContext.Provider>
  );
}
