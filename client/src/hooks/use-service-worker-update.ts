import { useState, useEffect, useCallback, useRef } from "react";

interface ServiceWorkerUpdate {
  hasUpdate: boolean;
  updateServiceWorker: () => void;
}

export function useServiceWorkerUpdate(): ServiceWorkerUpdate {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const initialVersionRef = useRef<string | null>(null);

  useEffect(() => {
    const checkServerVersion = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const serverVersion = data.version as string;

        if (initialVersionRef.current === null) {
          initialVersionRef.current = serverVersion;
        } else if (serverVersion !== initialVersionRef.current) {
          setHasUpdate(true);
        }
      } catch {
      }
    };

    checkServerVersion();

    const interval = setInterval(checkServerVersion, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkServerVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkServerVersion);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setHasUpdate(true);
        }

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
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkServerVersion);
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  return { hasUpdate, updateServiceWorker };
}
