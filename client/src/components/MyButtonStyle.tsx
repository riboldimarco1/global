import { Button } from "@/components/ui/button";
import { forwardRef, ComponentProps } from "react";
import { Loader2 } from "lucide-react";

type ButtonColor = "green" | "blue" | "red" | "yellow" | "gray" | "cyan" | "orange" | "indigo" | "emerald" | "teal" | "purple";

interface MyButtonStyleProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  color?: ButtonColor;
  loading?: boolean;
}

const colorClasses: Record<ButtonColor, string> = {
  green: "bg-green-700 border-2 border-green-800 text-white dark:text-gray-200 shadow-lg",
  blue: "bg-blue-700 border-2 border-blue-800 text-white dark:text-gray-200 shadow-lg",
  red: "bg-red-700 border-2 border-red-800 text-white dark:text-gray-200 shadow-lg",
  yellow: "bg-yellow-600 border-2 border-yellow-700 text-black dark:text-gray-200 shadow-lg",
  gray: "bg-gray-600 border-2 border-gray-700 text-white shadow-lg",
  cyan: "bg-cyan-700 border-2 border-cyan-800 text-white dark:text-gray-200 shadow-lg",
  orange: "bg-orange-700 border-2 border-orange-800 text-white dark:text-gray-200 shadow-lg",
  indigo: "bg-indigo-700 border-2 border-indigo-800 text-white dark:text-gray-200 shadow-lg",
  emerald: "bg-emerald-700 border-2 border-emerald-800 text-white dark:text-gray-200 shadow-lg",
  teal: "bg-teal-700 border-2 border-teal-800 text-white dark:text-gray-200 shadow-lg",
  purple: "bg-purple-700 border-2 border-purple-800 text-white dark:text-gray-200 shadow-lg",
};

const disabledClass = "bg-gray-400 border-2 border-gray-500 text-gray-200 shadow-none";

export const MyButtonStyle = forwardRef<HTMLButtonElement, MyButtonStyleProps>(
  ({ color = "gray", loading = false, disabled, className, children, ...props }, ref) => {
    const colorClass = disabled ? disabledClass : colorClasses[color];
    
    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className={`${colorClass} ${className || ""}`}
        disabled={disabled || loading}
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
