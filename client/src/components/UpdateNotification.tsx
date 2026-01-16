import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServiceWorkerUpdate } from "@/hooks/use-service-worker-update";
import { useState } from "react";

export function UpdateNotification() {
  const { hasUpdate, updateServiceWorker } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-primary text-primary-foreground rounded-md shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5"
      data-testid="update-notification"
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Nueva version disponible</p>
          <p className="text-xs opacity-90 mt-1">
            Actualiza para obtener las ultimas mejoras
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
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={updateServiceWorker}
          data-testid="button-update-now"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar ahora
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-primary-foreground"
          onClick={() => setDismissed(true)}
          data-testid="button-update-later"
        >
          Mas tarde
        </Button>
      </div>
    </div>
  );
}
