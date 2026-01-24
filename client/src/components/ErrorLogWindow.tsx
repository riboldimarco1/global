import { useState, useEffect, useRef } from "react";
import { X, Trash2, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorEntry {
  id: number;
  timestamp: string;
  type: "error" | "fetch" | "unhandled";
  message: string;
}

let errorIdCounter = 0;

export default function ErrorLogWindow() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const addError = (type: ErrorEntry["type"], message: string) => {
      const entry: ErrorEntry = {
        id: errorIdCounter++,
        timestamp: new Date().toLocaleTimeString(),
        type,
        message: message.substring(0, 500),
      };
      setErrors(prev => [...prev.slice(-49), entry]);
    };

    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);
      const message = args.map(arg => 
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      ).join(" ");
      addError("error", message);
    };

    const handleWindowError = (event: ErrorEvent) => {
      addError("unhandled", `${event.message} at ${event.filename}:${event.lineno}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason);
      addError("unhandled", `Promise rejected: ${message}`);
    };

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          const input = args[0];
          const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          let errorDetail = "";
          try {
            const clonedResponse = response.clone();
            const text = await clonedResponse.text();
            errorDetail = text.substring(0, 200);
          } catch {}
          addError("fetch", `${response.status} ${response.statusText} - ${url} ${errorDetail}`);
        }
        return response;
      } catch (error) {
        const input = args[0];
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        addError("fetch", `Network error: ${url} - ${error}`);
        throw error;
      }
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.error = originalError;
      window.fetch = originalFetch;
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && !isMinimized) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [errors, isMinimized]);

  if (!isVisible) {
    return (
      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-4 right-4 z-[9999] bg-red-600 hover:bg-red-700 text-white border-red-700"
        onClick={() => setIsVisible(true)}
        data-testid="button-show-error-log"
      >
        <Bug className="h-4 w-4" />
        {errors.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {errors.length}
          </span>
        )}
      </Button>
    );
  }

  const getTypeColor = (type: ErrorEntry["type"]) => {
    switch (type) {
      case "error": return "text-red-400";
      case "fetch": return "text-orange-400";
      case "unhandled": return "text-yellow-400";
    }
  };

  const getTypeLabel = (type: ErrorEntry["type"]) => {
    switch (type) {
      case "error": return "ERR";
      case "fetch": return "API";
      case "unhandled": return "UNH";
    }
  };

  return (
    <div 
      className="fixed bottom-4 right-4 z-[9999] bg-gray-900 border border-red-600 rounded-lg shadow-2xl"
      style={{ width: isMinimized ? "200px" : "400px" }}
      data-testid="error-log-window"
    >
      <div className="flex items-center justify-between px-3 py-2 bg-red-600 rounded-t-lg">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Bug className="h-4 w-4" />
          <span>Errores ({errors.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white hover:bg-red-700"
            onClick={() => setErrors([])}
            data-testid="button-clear-errors"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white hover:bg-red-700"
            onClick={() => setIsMinimized(!isMinimized)}
            data-testid="button-minimize-error-log"
          >
            {isMinimized ? "+" : "-"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white hover:bg-red-700"
            onClick={() => setIsVisible(false)}
            data-testid="button-hide-error-log"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <div 
          ref={containerRef}
          className="max-h-64 overflow-y-auto p-2 font-mono text-xs"
        >
          {errors.length === 0 ? (
            <div className="text-gray-500 text-center py-4">Sin errores</div>
          ) : (
            errors.map(err => (
              <div key={err.id} className="mb-1 border-b border-gray-800 pb-1">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500">{err.timestamp}</span>
                  <span className={`font-bold ${getTypeColor(err.type)}`}>
                    [{getTypeLabel(err.type)}]
                  </span>
                </div>
                <div className="text-gray-300 break-all pl-2">
                  {err.message}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
