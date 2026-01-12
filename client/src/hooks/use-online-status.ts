import { useState, useEffect, useCallback } from "react";
import { 
  getAllLocalRegistros, 
  saveLocalRegistros, 
  addLocalRegistro, 
  deleteLocalRegistro,
  addPendingAction, 
  getPendingActions, 
  removePendingAction
} from "@/lib/db";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Registro, InsertRegistro } from "@shared/schema";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await getPendingActions();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const pending = await getPendingActions();
      const successfulActions: string[] = [];

      for (const action of pending) {
        try {
          if (action.type === "create" && action.data) {
            const response = await apiRequest("POST", "/api/registros", action.data);
            if (response.ok) {
              successfulActions.push(action.id);
            }
          } else if (action.type === "delete" && action.registroId) {
            try {
              await apiRequest("DELETE", `/api/registros/${action.registroId}`);
              successfulActions.push(action.id);
            } catch (error) {
              successfulActions.push(action.id);
            }
          }
        } catch (error) {
          console.error("Error syncing action:", error);
        }
      }

      for (const actionId of successfulActions) {
        await removePendingAction(actionId);
      }

      const response = await fetch("/api/registros");
      if (response.ok) {
        const serverRegistros = await response.json();
        await saveLocalRegistros(serverRegistros);
        queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      }

      await updatePendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    updatePendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingActions, updatePendingCount]);

  const createRegistroOffline = useCallback(async (data: InsertRegistro): Promise<Registro> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const tempRegistro: Registro = {
      id: tempId,
      fecha: data.fecha,
      central: data.central,
      cantidad: data.cantidad,
      grado: data.grado ?? null,
    };

    await addLocalRegistro(tempRegistro);
    await addPendingAction({
      id: `create-${Date.now()}-${Math.random()}`,
      type: "create",
      data,
      timestamp: Date.now(),
    });
    await updatePendingCount();

    return tempRegistro;
  }, [updatePendingCount]);

  const deleteRegistroOffline = useCallback(async (id: string): Promise<void> => {
    await deleteLocalRegistro(id);
    
    if (!id.startsWith("temp-")) {
      await addPendingAction({
        id: `delete-${Date.now()}-${Math.random()}`,
        type: "delete",
        registroId: id,
        timestamp: Date.now(),
      });
      await updatePendingCount();
    }
  }, [updatePendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncPendingActions,
    createRegistroOffline,
    deleteRegistroOffline,
    getAllLocalRegistros,
    saveLocalRegistros,
  };
}
