import { Button } from "@/components/ui/button";
import { forwardRef, useState, ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { useStyleMode } from "@/contexts/StyleModeContext";

type ButtonColor = "green" | "blue" | "red" | "yellow" | "gray" | "cyan" | "orange" | "indigo" | "emerald" | "teal" | "purple";

interface MyButtonStyleProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  color?: ButtonColor;
  loading?: boolean;
}

const alegreClasses: Record<ButtonColor, string> = {
  green: "bg-gradient-to-b from-green-600 to-green-800 border-2 border-green-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(20,83,45)]",
  blue: "bg-gradient-to-b from-blue-600 to-blue-800 border-2 border-blue-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(30,58,138)]",
  red: "bg-gradient-to-b from-red-600 to-red-800 border-2 border-red-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(127,29,29)]",
  yellow: "bg-gradient-to-b from-yellow-500 to-yellow-700 border-2 border-yellow-800 text-black dark:text-gray-200 shadow-[0_4px_0_0_rgb(133,77,14)]",
  gray: "bg-gradient-to-b from-gray-500 to-gray-700 border-2 border-gray-800 text-white shadow-[0_4px_0_0_rgb(31,41,55)]",
  cyan: "bg-gradient-to-b from-cyan-600 to-cyan-800 border-2 border-cyan-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(22,78,99)]",
  orange: "bg-gradient-to-b from-orange-600 to-orange-800 border-2 border-orange-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(124,45,18)]",
  indigo: "bg-gradient-to-b from-indigo-600 to-indigo-800 border-2 border-indigo-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(49,46,129)]",
  emerald: "bg-gradient-to-b from-emerald-600 to-emerald-800 border-2 border-emerald-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(6,78,59)]",
  teal: "bg-gradient-to-b from-teal-600 to-teal-800 border-2 border-teal-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(19,78,74)]",
  purple: "bg-gradient-to-b from-purple-600 to-purple-800 border-2 border-purple-900 text-white dark:text-gray-200 shadow-[0_4px_0_0_rgb(88,28,135)]",
};

const minimizadoClasses: Record<ButtonColor, string> = {
  green: "bg-green-600 border border-green-700 text-white dark:text-gray-200 shadow-sm",
  blue: "bg-blue-600 border border-blue-700 text-white dark:text-gray-200 shadow-sm",
  red: "bg-red-600 border border-red-700 text-white dark:text-gray-200 shadow-sm",
  yellow: "bg-yellow-500 border border-yellow-600 text-black dark:text-gray-200 shadow-sm",
  gray: "bg-gray-500 border border-gray-600 text-white shadow-sm",
  cyan: "bg-cyan-600 border border-cyan-700 text-white dark:text-gray-200 shadow-sm",
  orange: "bg-orange-600 border border-orange-700 text-white dark:text-gray-200 shadow-sm",
  indigo: "bg-indigo-600 border border-indigo-700 text-white dark:text-gray-200 shadow-sm",
  emerald: "bg-emerald-600 border border-emerald-700 text-white dark:text-gray-200 shadow-sm",
  teal: "bg-teal-600 border border-teal-700 text-white dark:text-gray-200 shadow-sm",
  purple: "bg-purple-600 border border-purple-700 text-white dark:text-gray-200 shadow-sm",
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
