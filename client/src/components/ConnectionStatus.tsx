import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearAllLocalData } from "@/lib/db";

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
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllLocalData();
      window.location.reload();
    } catch (error) {
      console.error("Error clearing data:", error);
      setIsClearing(false);
    }
  };

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

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            data-testid="button-clear-cache"
            title="Borrar caché"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar datos locales?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará todos los datos guardados en este dispositivo y descargará la versión más reciente de la aplicación. Los datos en el servidor no se afectarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearData}
              disabled={isClearing}
              data-testid="button-confirm-clear"
            >
              {isClearing ? "Borrando..." : "Borrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
