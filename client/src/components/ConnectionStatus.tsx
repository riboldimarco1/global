import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectionStatusProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
}

export function ConnectionStatus({ 
  isOnline, 
  pendingCount, 
  isSyncing, 
  onSync 
}: ConnectionStatusProps) {
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="gap-1" data-testid="badge-offline">
          <WifiOff className="h-3 w-3" />
          Sin conexión
        </Badge>
      )}
      {pendingCount > 0 && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-pending">
          {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
        </Badge>
      )}
      {isOnline && pendingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className="h-7 gap-1"
          data-testid="button-sync"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
      )}
    </div>
  );
}
