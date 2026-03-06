import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface CalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (value: number) => void;
  initialValue?: number;
}

export function CalculatorDialog({
  open,
  onOpenChange,
  onResult,
  initialValue = 0,
}: CalculatorDialogProps) {
  const [display, setDisplay] = useState(initialValue.toString());
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const result = calculate(previousValue, inputValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (left: number, right: number, op: string): number => {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return right !== 0 ? left / right : 0;
      default:
        return right;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const inputValue = parseFloat(display);
      const result = calculate(previousValue, inputValue, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const handleAccept = () => {
    const value = parseFloat(display) || 0;
    onResult(value);
    onOpenChange(false);
    clear();
  };

  const handleCancel = () => {
    onOpenChange(false);
    clear();
  };

  const buttonClass = "h-12 text-lg font-medium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-xs ${windowStyle}`}>
        <DialogHeader>
          <DialogTitle>Calculadora</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div
            className="h-14 bg-muted rounded-md flex items-center justify-end px-4 text-2xl font-mono"
            data-testid="calculator-display"
          >
            {display}
          </div>
          <div className="grid grid-cols-4 gap-1">
            <Button
              variant="outline"
              className={buttonClass}
              onClick={clear}
              data-testid="calculator-clear"
            >
              C
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={backspace}
              data-testid="calculator-backspace"
            >
              <Delete className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => performOperation("/")}
              data-testid="calculator-divide"
            >
              /
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => performOperation("*")}
              data-testid="calculator-multiply"
            >
              *
            </Button>

            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("7")}
              data-testid="calculator-7"
            >
              7
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("8")}
              data-testid="calculator-8"
            >
              8
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("9")}
              data-testid="calculator-9"
            >
              9
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => performOperation("-")}
              data-testid="calculator-subtract"
            >
              -
            </Button>

            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("4")}
              data-testid="calculator-4"
            >
              4
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("5")}
              data-testid="calculator-5"
            >
              5
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("6")}
              data-testid="calculator-6"
            >
              6
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => performOperation("+")}
              data-testid="calculator-add"
            >
              +
            </Button>

            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("1")}
              data-testid="calculator-1"
            >
              1
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("2")}
              data-testid="calculator-2"
            >
              2
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={() => inputDigit("3")}
              data-testid="calculator-3"
            >
              3
            </Button>
            <Button
              variant="default"
              className={`${buttonClass} row-span-2`}
              onClick={handleEquals}
              data-testid="calculator-equals"
            >
              =
            </Button>

            <Button
              variant="outline"
              className={`${buttonClass} col-span-2`}
              onClick={() => inputDigit("0")}
              data-testid="calculator-0"
            >
              0
            </Button>
            <Button
              variant="outline"
              className={buttonClass}
              onClick={inputDecimal}
              data-testid="calculator-decimal"
            >
              .
            </Button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              data-testid="calculator-cancel"
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              data-testid="calculator-accept"
            >
              Aceptar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
