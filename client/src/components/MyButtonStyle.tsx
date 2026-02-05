import { Button } from "@/components/ui/button";
import { forwardRef, ComponentProps } from "react";
import { Loader2 } from "lucide-react";

type ButtonColor = "green" | "blue" | "red" | "yellow" | "gray";

interface MyButtonStyleProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  color?: ButtonColor;
  loading?: boolean;
}

const colorClasses: Record<ButtonColor, string> = {
  green: "bg-green-500/15 border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/25 hover:border-green-500/70",
  blue: "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 hover:border-blue-500/70",
  red: "bg-red-500/15 border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-500/25 hover:border-red-500/70",
  yellow: "bg-yellow-500/15 border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/25 hover:border-yellow-500/70",
  gray: "bg-muted/50 border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:border-muted-foreground/50",
};

const disabledClass = "bg-muted/30 border-muted-foreground/20 text-muted-foreground/40";

export const MyButtonStyle = forwardRef<HTMLButtonElement, MyButtonStyleProps>(
  ({ color = "gray", loading = false, disabled, className, children, ...props }, ref) => {
    const colorClass = disabled ? disabledClass : colorClasses[color];
    
    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className={`border-2 font-medium ${colorClass} ${className || ""}`}
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
