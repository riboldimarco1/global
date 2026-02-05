import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, LayoutGrid, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function BackgroundColorPicker() {
  const [lightColor, setLightColor] = useState(() => localStorage.getItem("app-bg-color-light") || "");
  const [darkColor, setDarkColor] = useState(() => localStorage.getItem("app-bg-color-dark") || "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyColor = useCallback(() => {
    const dark = isDarkMode();
    const color = dark ? darkColor : lightColor;
    
    if (color) {
      const hslValue = hexToHsl(color);
      document.documentElement.style.setProperty("--background", hslValue);
    } else {
      document.documentElement.style.removeProperty("--background");
    }
  }, [lightColor, darkColor]);

  useEffect(() => {
    applyColor();
    if (lightColor) localStorage.setItem("app-bg-color-light", lightColor);
    else localStorage.removeItem("app-bg-color-light");
    if (darkColor) localStorage.setItem("app-bg-color-dark", darkColor);
    else localStorage.removeItem("app-bg-color-dark");
  }, [lightColor, darkColor, applyColor]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyColor();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [applyColor]);

  const handleReset = () => {
    setLightColor("");
    setDarkColor("");
    document.documentElement.style.removeProperty("--background");
  };

  const dark = isDarkMode();
  const currentColor = dark ? darkColor : lightColor;
  const setCurrentColor = dark ? setDarkColor : setLightColor;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          data-testid="button-bg-color-picker"
        >
          <span className="p-1 rounded-md border-2 bg-sky-600 border-sky-700 flex items-center justify-center">
            <Monitor className="h-4 w-4 text-white" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-2">
          <label className="text-xs font-medium block">
            Fondo de aplicación ({dark ? "oscuro" : "claro"})
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="color"
              value={currentColor || (dark ? "#1a1a1a" : "#ffffff")}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
              data-testid="input-bg-color"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              data-testid="button-reset-bg-color"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restablecer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function WindowColorPicker() {
  const [lightColor, setLightColor] = useState(() => localStorage.getItem("app-window-color-light") || "");
  const [darkColor, setDarkColor] = useState(() => localStorage.getItem("app-window-color-dark") || "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyColor = useCallback(() => {
    const dark = isDarkMode();
    const color = dark ? darkColor : lightColor;
    
    if (color) {
      const hslValue = hexToHsl(color);
      document.documentElement.style.setProperty("--card", hslValue);
    } else {
      document.documentElement.style.removeProperty("--card");
    }
  }, [lightColor, darkColor]);

  useEffect(() => {
    applyColor();
    if (lightColor) localStorage.setItem("app-window-color-light", lightColor);
    else localStorage.removeItem("app-window-color-light");
    if (darkColor) localStorage.setItem("app-window-color-dark", darkColor);
    else localStorage.removeItem("app-window-color-dark");
  }, [lightColor, darkColor, applyColor]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyColor();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [applyColor]);

  const handleReset = () => {
    setLightColor("");
    setDarkColor("");
    document.documentElement.style.removeProperty("--card");
  };

  const dark = isDarkMode();
  const currentColor = dark ? darkColor : lightColor;
  const setCurrentColor = dark ? setDarkColor : setLightColor;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          data-testid="button-window-color-picker"
        >
          <span className="p-1 rounded-md border-2 bg-pink-600 border-pink-700 flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-white" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-2">
          <label className="text-xs font-medium block">
            Fondo de ventanas ({dark ? "oscuro" : "claro"})
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="color"
              value={currentColor || (dark ? "#1a1a1a" : "#ffffff")}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
              data-testid="input-window-color"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              data-testid="button-reset-window-color"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restablecer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
