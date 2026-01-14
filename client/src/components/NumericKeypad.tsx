import { Button } from "@/components/ui/button";
import { Check, Delete, Undo2 } from "lucide-react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onClose?: () => void;
}

export function NumericKeypad({ value, onChange, onApply, onClose }: NumericKeypadProps) {
  const handleDigit = (digit: string) => {
    onChange(value + digit);
  };

  const handleDelete = () => {
    if (value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange("");
  };

  const handleDecimal = () => {
    if (!value.includes(",") && !value.includes(".")) {
      onChange(value + ",");
    }
  };

  const handleTripleZero = () => {
    if (value.length > 0 && value !== "0") {
      onChange(value + "000");
    }
  };

  const buttonClass = "h-14 text-xl font-medium hover-elevate active-elevate-2 border";

  return (
    <div className="grid grid-cols-4 gap-1 p-2 bg-muted/30 rounded-lg">
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("1")}
        data-testid="keypad-1"
      >
        1
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("2")}
        data-testid="keypad-2"
      >
        2
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("3")}
        data-testid="keypad-3"
      >
        3
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={handleDelete}
        data-testid="keypad-delete"
      >
        <Delete className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("4")}
        data-testid="keypad-4"
      >
        4
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("5")}
        data-testid="keypad-5"
      >
        5
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("6")}
        data-testid="keypad-6"
      >
        6
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-14 text-xl font-medium bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-700 dark:text-amber-400"
        onClick={handleClear}
        data-testid="keypad-clear"
      >
        <Undo2 className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("7")}
        data-testid="keypad-7"
      >
        7
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("8")}
        data-testid="keypad-8"
      >
        8
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("9")}
        data-testid="keypad-9"
      >
        9
      </Button>
      <div className="row-span-2">
        <Button
          type="button"
          variant="outline"
          className="h-full w-full text-xl font-medium bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-700 dark:text-green-400"
          onClick={onApply}
          data-testid="keypad-apply"
        >
          <Check className="h-6 w-6" />
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => handleDigit("0")}
        data-testid="keypad-0"
      >
        0
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={handleDecimal}
        data-testid="keypad-decimal"
      >
        ,
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={handleTripleZero}
        data-testid="keypad-000"
      >
        000
      </Button>
    </div>
  );
}
