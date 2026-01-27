import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const backgroundColors = [
  { name: "Por defecto", light: "", dark: "" },
  { name: "Gris claro", light: "0 0% 96%", dark: "0 0% 12%" },
  { name: "Gris medio", light: "0 0% 92%", dark: "0 0% 16%" },
  { name: "Gris oscuro", light: "0 0% 88%", dark: "0 0% 20%" },
  { name: "Azul suave", light: "210 20% 94%", dark: "210 20% 14%" },
  { name: "Verde suave", light: "142 20% 94%", dark: "142 20% 12%" },
  { name: "Beige", light: "40 30% 94%", dark: "40 15% 12%" },
];

const windowColors = [
  { name: "Por defecto", light: "", dark: "" },
  { name: "Blanco", light: "0 0% 100%", dark: "0 0% 10%" },
  { name: "Gris claro", light: "0 0% 98%", dark: "0 0% 14%" },
  { name: "Gris medio", light: "0 0% 95%", dark: "0 0% 18%" },
  { name: "Azul suave", light: "210 30% 97%", dark: "210 20% 12%" },
  { name: "Verde suave", light: "142 30% 97%", dark: "142 20% 10%" },
  { name: "Beige", light: "40 40% 97%", dark: "40 15% 10%" },
];

function applyColors(bgColorName: string, windowColorName: string) {
  const isDark = document.documentElement.classList.contains("dark");
  
  const bgColorObj = backgroundColors.find(c => c.name === bgColorName);
  if (bgColorObj && bgColorObj.light) {
    const hslValue = isDark ? bgColorObj.dark : bgColorObj.light;
    document.documentElement.style.setProperty("--background", hslValue);
  } else {
    document.documentElement.style.removeProperty("--background");
  }
  
  const windowColorObj = windowColors.find(c => c.name === windowColorName);
  if (windowColorObj && windowColorObj.light) {
    const hslValue = isDark ? windowColorObj.dark : windowColorObj.light;
    document.documentElement.style.setProperty("--card", hslValue);
  } else {
    document.documentElement.style.removeProperty("--card");
  }
}

export function ColorSettings() {
  const [bgColorName, setBgColorName] = useState(() => localStorage.getItem("app-bg-color-name") || "Por defecto");
  const [windowColorName, setWindowColorName] = useState(() => localStorage.getItem("app-window-color-name") || "Por defecto");

  const updateColors = useCallback(() => {
    applyColors(bgColorName, windowColorName);
  }, [bgColorName, windowColorName]);

  useEffect(() => {
    updateColors();
    localStorage.setItem("app-bg-color-name", bgColorName);
  }, [bgColorName, updateColors]);

  useEffect(() => {
    updateColors();
    localStorage.setItem("app-window-color-name", windowColorName);
  }, [windowColorName, updateColors]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      updateColors();
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [updateColors]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="px-2"
          data-testid="button-color-settings"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">Fondo de aplicación</label>
            <div className="grid grid-cols-4 gap-1">
              {backgroundColors.map((color) => (
                <button
                  key={color.name}
                  className={`h-6 w-full rounded border-2 transition-all hover-elevate ${
                    bgColorName === color.name 
                      ? "border-primary ring-1 ring-primary" 
                      : "border-muted"
                  }`}
                  style={{ 
                    backgroundColor: color.light ? `hsl(${color.light})` : "hsl(var(--background))",
                  }}
                  onClick={() => setBgColorName(color.name)}
                  title={color.name}
                  data-testid={`button-bg-color-${color.name.toLowerCase().replace(/\s/g, "-")}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium mb-1.5 block">Fondo de ventanas</label>
            <div className="grid grid-cols-4 gap-1">
              {windowColors.map((color) => (
                <button
                  key={color.name}
                  className={`h-6 w-full rounded border-2 transition-all hover-elevate ${
                    windowColorName === color.name 
                      ? "border-primary ring-1 ring-primary" 
                      : "border-muted"
                  }`}
                  style={{ 
                    backgroundColor: color.light ? `hsl(${color.light})` : "hsl(var(--card))",
                  }}
                  onClick={() => setWindowColorName(color.name)}
                  title={color.name}
                  data-testid={`button-window-color-${color.name.toLowerCase().replace(/\s/g, "-")}`}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
