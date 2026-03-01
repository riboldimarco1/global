import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const userContext = {
  activeWindow: "Inicio",
  currentAction: "Navegando",
  username: "Desconocido",
  
  setWindow(window: string) {
    this.activeWindow = window;
  },
  setAction(action: string) {
    this.currentAction = action;
  },
  setUsername(name: string) {
    this.username = name;
  },
  getHeaders() {
    return {
      "X-Active-Window": this.activeWindow,
      "X-User-Action": this.currentAction,
      "X-Username": this.username,
    };
  }
};

type TimingListener = (ms: number, url: string) => void;

export const requestTiming = {
  lastMs: 0,
  lastUrl: "",
  _listeners: [] as TimingListener[],

  record(ms: number, url: string) {
    this.lastMs = Math.round(ms);
    this.lastUrl = url;
    for (const fn of this._listeners) {
      fn(this.lastMs, this.lastUrl);
    }
  },

  subscribe(fn: TimingListener) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  },
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const t0 = performance.now();
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...userContext.getHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  requestTiming.record(performance.now() - t0, url);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const t0 = performance.now();
    const res = await fetch(url, {
      credentials: "include",
      headers: userContext.getHeaders(),
    });
    requestTiming.record(performance.now() - t0, url);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
