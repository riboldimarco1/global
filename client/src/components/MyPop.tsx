import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MyPopState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
}

interface MyPopContextType {
  showPop: (options: { 
    title: string; 
    message: string; 
    onConfirm?: () => void;
    confirmText?: string;
  }) => void;
  closePop: () => void;
}

const MyPopContext = createContext<MyPopContextType | null>(null);

export function useMyPop() {
  const context = useContext(MyPopContext);
  if (!context) {
    throw new Error("useMyPop must be used within MyPopProvider");
  }
  return context;
}

export function MyPopProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MyPopState>({
    isOpen: false,
    title: "",
    message: "",
  });
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Cargar posición guardada
  useEffect(() => {
    const saved = localStorage.getItem("mypop_position");
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        setPosition(pos);
      } catch (e) {
        // Posición por defecto centrada
      }
    }
  }, []);

  // Centrar el modal cuando se abre si no hay posición guardada
  useEffect(() => {
    if (state.isOpen && popRef.current) {
      const saved = localStorage.getItem("mypop_position");
      if (!saved) {
        const rect = popRef.current.getBoundingClientRect();
        const x = (window.innerWidth - rect.width) / 2;
        const y = (window.innerHeight - rect.height) / 3;
        setPosition({ x, y });
      }
    }
  }, [state.isOpen]);

  // Guardar posición
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem("mypop_position", JSON.stringify(position));
    }
  }, [position]);

  // Manejo de arrastre
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (popRef.current) {
      const rect = popRef.current.getBoundingClientRect();
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

  // Cerrar al hacer clic fuera
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setState(prev => ({ ...prev, isOpen: false }));
    }
  }, []);

  const showPop = useCallback((options: { 
    title: string; 
    message: string; 
    onConfirm?: () => void;
    confirmText?: string;
  }) => {
    setState({
      isOpen: true,
      title: options.title,
      message: options.message,
      onConfirm: options.onConfirm,
      confirmText: options.confirmText
    });
  }, []);

  const closePop = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (state.onConfirm) {
      state.onConfirm();
    }
    closePop();
  }, [state.onConfirm, closePop]);

  return (
    <MyPopContext.Provider value={{ showPop, closePop }}>
      {children}
      
      {state.isOpen && (
        <div 
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 z-[9999]"
          onClick={handleOverlayClick}
          data-testid="mypop-overlay"
        >
          <div
            ref={popRef}
            className="absolute bg-card border-2 border-red-500 rounded-lg shadow-2xl min-w-[280px] max-w-[90vw]"
            style={{
              left: position.x,
              top: position.y,
              cursor: isDragging ? "grabbing" : "default"
            }}
            data-testid="mypop-modal"
          >
            {/* Header arrastrable */}
            <div 
              className="flex items-center justify-between gap-3 px-4 py-3 border-b border-red-500/30 bg-red-500/10 rounded-t-lg cursor-move"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-red-600 dark:text-red-400">{state.title}</span>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={closePop}
                className="h-6 w-6 hover:bg-red-500/20"
                data-testid="mypop-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Contenido */}
            <div className="px-4 py-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{state.message}</p>
            </div>
            
            {/* Footer con botones */}
            {state.onConfirm && (
              <div className="flex justify-end gap-2 px-4 py-3 border-t border-red-500/30 bg-muted/30 rounded-b-lg">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={closePop}
                  data-testid="mypop-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleConfirm}
                  data-testid="mypop-confirm"
                >
                  {state.confirmText || "Confirmar"}
                </Button>
              </div>
            )}
            
            {/* Solo botón cerrar si no hay confirmación */}
            {!state.onConfirm && (
              <div className="flex justify-end px-4 py-3 border-t border-red-500/30 bg-muted/30 rounded-b-lg">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={closePop}
                  data-testid="mypop-ok"
                >
                  Aceptar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </MyPopContext.Provider>
  );
}
