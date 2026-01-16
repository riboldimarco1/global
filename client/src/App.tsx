import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { UpdateNotification } from "@/components/UpdateNotification";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Guia from "@/pages/Guia";

function RealtimeSyncProvider({ children }: { children: JSX.Element | JSX.Element[] }) {
  useRealtimeSync();
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/guia" component={Guia} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RealtimeSyncProvider>
          <Toaster />
          <UpdateNotification />
          <Router />
        </RealtimeSyncProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
