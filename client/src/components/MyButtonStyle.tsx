import { Button } from "@/components/ui/button";
import { forwardRef, ComponentProps } from "react";
import { Loader2 } from "lucide-react";

type ButtonColor = "green" | "blue" | "red" | "yellow" | "gray";

interface MyButtonStyleProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  color?: ButtonColor;
  loading?: boolean;
}

const colorClasses: Record<ButtonColor, string> = {
  green: "text-green-600",
  blue: "text-blue-600",
  red: "text-red-600",
  yellow: "text-yellow-600",
  gray: "text-muted-foreground",
};

const disabledClass = "text-muted-foreground/40";

export const MyButtonStyle = forwardRef<HTMLButtonElement, MyButtonStyleProps>(
  ({ color = "gray", loading = false, disabled, className, children, ...props }, ref) => {
    const colorClass = disabled ? disabledClass : colorClasses[color];
    
    return (
      <Button
        ref={ref}
        variant="ghost"
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
