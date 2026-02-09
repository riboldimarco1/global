import { Button } from "@/components/ui/button";
import { forwardRef, useState, ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { useStyleMode } from "@/contexts/StyleModeContext";

type ButtonColor = "green" | "blue" | "red" | "yellow" | "gray" | "cyan" | "orange" | "indigo" | "emerald" | "teal" | "purple";

interface MyButtonStyleProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  color?: ButtonColor;
  loading?: boolean;
}

const bwAlegre = "bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-black text-white shadow-[0_4px_0_0_rgb(0,0,0)]";
const alegreClasses: Record<ButtonColor, string> = {
  green: bwAlegre,
  blue: bwAlegre,
  red: bwAlegre,
  yellow: bwAlegre,
  gray: bwAlegre,
  cyan: bwAlegre,
  orange: bwAlegre,
  indigo: bwAlegre,
  emerald: bwAlegre,
  teal: bwAlegre,
  purple: bwAlegre,
};

const bwMinimizado = "bg-gray-800 border border-gray-900 text-white shadow-sm";
const minimizadoClasses: Record<ButtonColor, string> = {
  green: bwMinimizado,
  blue: bwMinimizado,
  red: bwMinimizado,
  yellow: bwMinimizado,
  gray: bwMinimizado,
  cyan: bwMinimizado,
  orange: bwMinimizado,
  indigo: bwMinimizado,
  emerald: bwMinimizado,
  teal: bwMinimizado,
  purple: bwMinimizado,
};

const disabledClass = "bg-gray-400 border-2 border-gray-500 text-gray-200 shadow-none cursor-not-allowed";

export const MyButtonStyle = forwardRef<HTMLButtonElement, MyButtonStyleProps>(
  ({ color = "gray", loading = false, disabled, className, children, onClick, ...props }, ref) => {
    const { isAlegre } = useStyleMode();
    const [flashing, setFlashing] = useState(false);
    const colorClasses = isAlegre ? alegreClasses : minimizadoClasses;
    const colorClass = disabled ? disabledClass : colorClasses[color];
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setFlashing(false);
      requestAnimationFrame(() => setFlashing(true));
      setTimeout(() => setFlashing(false), 300);
      onClick?.(e);
    };
    
    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className={`${colorClass} ${flashing ? "animate-flash" : ""} ${className || ""}`}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Button>
    );
  }
);

MyButtonStyle.displayName = "MyButtonStyle";

export default MyButtonStyle;
