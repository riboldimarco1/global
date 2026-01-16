import { usePinchZoom } from "@/hooks/use-pinch-zoom";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

interface ZoomableChartProps {
  children: ReactNode;
  height?: string;
  chartRef?: React.RefObject<HTMLDivElement>;
}

export function ZoomableChart({ children, height = "h-72", chartRef }: ZoomableChartProps) {
  const { containerRef, style, scale, resetZoom, isZoomed } = usePinchZoom(1, 5);

  return (
    <div className="relative">
      {isZoomed && (
        <div className="absolute top-0 right-0 z-10 flex gap-1">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7"
            onClick={resetZoom}
            data-testid="button-reset-zoom"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`${height} w-full overflow-hidden touch-pan-y`}
      >
        <div 
          ref={chartRef}
          style={style} 
          className="h-full w-full transition-transform duration-75"
        >
          {children}
        </div>
      </div>
      {!isZoomed && (
        <p className="text-xs text-muted-foreground text-center mt-1 md:hidden">
          Pellizca para ampliar
        </p>
      )}
      {isZoomed && (
        <p className="text-xs text-muted-foreground text-center mt-1">
          Zoom: {Math.round(scale * 100)}% - Doble toque para reiniciar
        </p>
      )}
    </div>
  );
}
