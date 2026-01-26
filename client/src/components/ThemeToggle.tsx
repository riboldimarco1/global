import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, Palette, Check } from "lucide-react";
import { 
  getTheme, 
  setTheme, 
  getColorScheme, 
  setColorScheme, 
  colorSchemes,
  type Theme, 
  type ColorScheme 
} from "@/lib/theme";

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme>(getColorScheme());

  useEffect(() => {
    setCurrentTheme(getTheme());
    setCurrentColorScheme(getColorScheme());
  }, []);

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    setTheme(theme);
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setCurrentColorScheme(scheme);
    setColorScheme(scheme);
  };

  const icon = currentTheme === "dark" ? <Moon className="h-4 w-4" /> : 
               currentTheme === "light" ? <Sun className="h-4 w-4" /> : 
               <Monitor className="h-4 w-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5" data-testid="button-theme-toggle" style={{ zIndex: 1000 }}>
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" style={{ zIndex: 1001 }}>
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sun className="h-3 w-3" />
          Modo
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("light")}
          data-testid="menu-theme-light"
        >
          <Sun className="h-4 w-4 mr-2" />
          Claro
          {currentTheme === "light" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("medium")}
          data-testid="menu-theme-medium"
        >
          <Palette className="h-4 w-4 mr-2" />
          Intermedio
          {currentTheme === "medium" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("dark")}
          data-testid="menu-theme-dark"
        >
          <Moon className="h-4 w-4 mr-2" />
          Oscuro
          {currentTheme === "dark" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("system")}
          data-testid="menu-theme-system"
        >
          <Monitor className="h-4 w-4 mr-2" />
          Sistema
          {currentTheme === "system" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-3 w-3" />
          Color
        </DropdownMenuLabel>
        {colorSchemes.map((scheme) => (
          <DropdownMenuItem
            key={scheme.id}
            onClick={() => handleColorSchemeChange(scheme.id)}
            data-testid={`menu-color-${scheme.id}`}
          >
            <div 
              className="h-4 w-4 rounded-full mr-2 border border-border" 
              style={{ backgroundColor: scheme.color }}
            />
            {scheme.name}
            {currentColorScheme === scheme.id && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
