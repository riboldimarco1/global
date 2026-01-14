import { ClipboardList } from "lucide-react";
import type { ReactNode } from "react";

interface HeaderProps {
  children?: ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
              Arrime Nucleo RMW
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              by Marco Riboldi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </header>
  );
}
