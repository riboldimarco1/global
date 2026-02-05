import { Button } from "@/components/ui/button";
import { forwardRef, ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { useGridSettings } from "@/contexts/GridSettingsContext";

type ButtonColor = "green" | "blue" | "red" | "yellow" | "gray";

interface MyButtonStyleProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  color?: ButtonColor;
  loading?: boolean;
}

const normalColorClasses: Record<ButtonColor, string> = {
  green: "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-500/20",
  blue: "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
  red: "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400 hover:bg-red-500/20",
  yellow: "bg-yellow-500/10 border-yellow-500/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
  gray: "bg-muted/40 border-muted-foreground/25 text-muted-foreground hover:bg-muted/60",
};

const boldColorClasses: Record<ButtonColor, string> = {
  green: "bg-green-500/30 border-green-600 text-green-800 dark:bg-green-600/40 dark:text-green-200 dark:border-green-400 hover:bg-green-500/50 hover:border-green-700 dark:hover:bg-green-500/60 shadow-sm shadow-green-500/30 [&_svg]:text-green-600 dark:[&_svg]:text-green-300",
  blue: "bg-blue-500/30 border-blue-600 text-blue-800 dark:bg-blue-600/40 dark:text-blue-200 dark:border-blue-400 hover:bg-blue-500/50 hover:border-blue-700 dark:hover:bg-blue-500/60 shadow-sm shadow-blue-500/30 [&_svg]:text-blue-600 dark:[&_svg]:text-blue-300",
  red: "bg-red-500/30 border-red-600 text-red-800 dark:bg-red-600/40 dark:text-red-200 dark:border-red-400 hover:bg-red-500/50 hover:border-red-700 dark:hover:bg-red-500/60 shadow-sm shadow-red-500/30 [&_svg]:text-red-600 dark:[&_svg]:text-red-300",
  yellow: "bg-yellow-400/40 border-yellow-600 text-yellow-800 dark:bg-yellow-500/40 dark:text-yellow-200 dark:border-yellow-400 hover:bg-yellow-400/60 hover:border-yellow-700 dark:hover:bg-yellow-500/60 shadow-sm shadow-yellow-500/30 [&_svg]:text-yellow-600 dark:[&_svg]:text-yellow-300",
  gray: "bg-slate-200/60 border-slate-400 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200 dark:border-slate-400 hover:bg-slate-300/70 hover:border-slate-500 dark:hover:bg-slate-500/50 shadow-sm shadow-slate-400/30 [&_svg]:text-slate-500 dark:[&_svg]:text-slate-300",
};

const disabledClass = "bg-muted/30 border-muted-foreground/30 text-muted-foreground/50 [&_svg]:text-muted-foreground/50";

export const MyButtonStyle = forwardRef<HTMLButtonElement, MyButtonStyleProps>(
  ({ color = "gray", loading = false, disabled, className, children, ...props }, ref) => {
    const { settings } = useGridSettings();
    const colorClasses = settings.boldButtons ? boldColorClasses : normalColorClasses;
    const colorClass = disabled ? disabledClass : colorClasses[color];
    const borderWidth = settings.boldButtons ? "border-[3px]" : "border";
    const fontWeight = settings.boldButtons ? "font-semibold" : "font-medium";
    
    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className={`${borderWidth} ${fontWeight} ${colorClass} ${className || ""}`}
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
