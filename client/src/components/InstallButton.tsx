import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MonitorSmartphone, Check } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function InstallButton() {
  const { isInstallable, isInstalled, install } = usePwaInstall();

  if (isInstalled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled data-testid="button-installed">
            <Check className="h-4 w-4 text-green-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Aplicación instalada</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={install}
          data-testid="button-install-app"
        >
          <MonitorSmartphone className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Instalar como aplicación</p>
      </TooltipContent>
    </Tooltip>
  );
}
