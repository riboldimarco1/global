import { useServiceWorkerUpdate } from "@/hooks/use-service-worker-update";
import { useMyPop } from "@/components/MyPop";
import { useEffect, useRef } from "react";

export function UpdateNotification() {
  const { hasUpdate, updateServiceWorker } = useServiceWorkerUpdate();
  const { showPop } = useMyPop();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!hasUpdate || shownRef.current) return;
    shownRef.current = true;

    const doUpdate = async () => {
      try {
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
      updateServiceWorker();
    };

    showPop({
      title: "Actualización disponible",
      message: "Hay una nueva versión de la aplicación. Se recargará la página al aceptar.",
      confirmText: "Aceptar",
      onConfirm: () => {
        doUpdate();
      }
    });
  }, [hasUpdate, updateServiceWorker, showPop]);

  return null;
}
