import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  // Separar toasts con posición de los normales
  const positionedToasts = toasts.filter(t => t.position)
  const normalToasts = toasts.filter(t => !t.position)

  return (
    <>
      {/* Toasts posicionados cerca del botón */}
      {positionedToasts.map(function ({ id, title, description, action, position, variant, ...props }) {
        if (!position) return null;
        
        // Calcular posición ajustada para que no se salga de la pantalla
        const toastWidth = 280;
        const toastHeight = 80;
        const margin = 10;
        const maxX = typeof window !== 'undefined' ? window.innerWidth - toastWidth - margin : 0;
        const maxY = typeof window !== 'undefined' ? window.innerHeight - toastHeight - margin : 0;
        const adjustedX = Math.min(Math.max(margin, position.x - toastWidth / 2), maxX);
        const adjustedY = Math.min(Math.max(margin, position.y + 15), maxY);
        
        return (
          <div
            key={id}
            role="alert"
            aria-live="assertive"
            className={`fixed z-[10002] pointer-events-auto flex items-center justify-between space-x-2 overflow-hidden rounded-md border p-3 pr-8 shadow-lg animate-in fade-in-0 slide-in-from-top-2 ${
              variant === "destructive" 
                ? "border-destructive bg-destructive text-destructive-foreground" 
                : "border bg-background text-foreground"
            }`}
            style={{ left: adjustedX, top: adjustedY, width: toastWidth }}
          >
            <div className="grid gap-0.5">
              {title && <div className="text-sm font-semibold">{title}</div>}
              {description && <div className="text-xs opacity-90">{description}</div>}
            </div>
            {action}
            <button
              onClick={() => dismiss(id)}
              className="absolute right-1.5 top-1.5 rounded-md p-1 text-foreground/50 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}

      {/* Toasts normales (posición fija en esquina) */}
      <ToastProvider>
        {normalToasts.map(function ({ id, title, description, action, position, ...props }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
          )
        })}
        <ToastViewport />
      </ToastProvider>
    </>
  )
}
