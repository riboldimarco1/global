import { RefreshCw, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useServiceWorkerUpdate } from "@/hooks/use-service-worker-update";
import { useState } from "react";

export function UpdateNotification() {
  const { hasUpdate, updateServiceWorker } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!hasUpdate || dismissed) {
    return null;
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      updateServiceWorker();
    } catch (error) {
      console.error("Error clearing cache:", error);
      updateServiceWorker();
    }
  };

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-primary text-primary-foreground rounded-md shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5"
      data-testid="update-notification"
    >
      <div className="flex items-start gap-3">
        <Download className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Descargar nueva versión</p>
          <p className="text-xs opacity-90 mt-1">
            Hay una nueva versión disponible. ¿Desea instalarla ahora?
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-primary-foreground flex-shrink-0"
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-update"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2 mt-3">
        <MyButtonStyle
          color="green"
          className="flex-1"
          onClick={handleUpdate}
          loading={isUpdating}
          data-testid="button-update-now"
        >
          {isUpdating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isUpdating ? "Instalando..." : "Sí, actualizar"}
        </MyButtonStyle>
        <MyButtonStyle
          color="gray"
          onClick={() => setDismissed(true)}
          disabled={isUpdating}
          data-testid="button-update-later"
        >
          No, más tarde
        </MyButtonStyle>
      </div>
    </div>
  );
}
