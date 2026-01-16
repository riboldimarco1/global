import { useState, useEffect, useCallback } from "react";

interface ServiceWorkerUpdate {
  hasUpdate: boolean;
  updateServiceWorker: () => void;
}

export function useServiceWorkerUpdate(): ServiceWorkerUpdate {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const checkForWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setHasUpdate(true);
      }
    };

    const checkForUpdates = () => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update().catch(() => {});
      });
    };

    navigator.serviceWorker.ready.then((registration) => {
      checkForWaitingWorker(registration);

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setHasUpdate(true);
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkForUpdates);

    const interval = setInterval(checkForUpdates, 60000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkForUpdates);
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  }, [waitingWorker]);

  return { hasUpdate, updateServiceWorker };
}
