import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { X, Save } from "lucide-react";
import { Column } from "./MyGrid";

interface MyFloatingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  columns: Column[];
  title?: string;
}

export default function MyFloatingForm({
  isOpen,
  onClose,
  onSave,
  columns,
  title = "Agregar Registro",
}: MyFloatingFormProps) {
  const editableColumns = columns.filter(col => 
    col.key !== "id" && col.key !== "prop"
  );

  const defaultValues = editableColumns.reduce((acc, col) => {
    acc[col.key] = col.type === "boolean" ? "" : col.type === "number" ? "" : "";
    return acc;
  }, {} as Record<string, any>);

  const form = useForm({
    defaultValues,
  });

  if (!isOpen) return null;

  const onSubmit = (data: Record<string, any>) => {
    const processedData = { ...data };
    editableColumns.forEach(col => {
      if (col.type === "number" && processedData[col.key] !== "") {
        processedData[col.key] = Number(processedData[col.key]);
      }
      if (col.type === "boolean") {
        processedData[col.key] = processedData[col.key] === "true";
      }
    });
    onSave(processedData);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
      onClick={handleClose}
      data-testid="floating-form-overlay"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="bg-background border-2 border-green-500/50 rounded-lg shadow-2xl min-w-[400px] max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-testid="floating-form-window"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-green-500/30 rounded-t-lg shrink-0">
              <h3 className="text-sm font-semibold text-foreground" data-testid="text-form-title">{title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                data-testid="floating-form-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                  {editableColumns.map((col) => (
                    <FormField
                      key={col.key}
                      control={form.control}
                      name={col.key}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs" data-testid={`label-${col.key}`}>
                            {col.label}
                          </FormLabel>
                          <FormControl>
                            {col.type === "boolean" ? (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger data-testid={`input-${col.key}`}>
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Sí</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : col.type === "date" ? (
                              <Input
                                type="date"
                                {...field}
                                data-testid={`input-${col.key}`}
                              />
                            ) : col.type === "number" ? (
                              <Input
                                type="number"
                                step="any"
                                {...field}
                                data-testid={`input-${col.key}`}
                              />
                            ) : (
                              <Input
                                type="text"
                                {...field}
                                data-testid={`input-${col.key}`}
                              />
                            )}
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2 px-4 py-3 border-t bg-muted/30 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    data-testid="button-form-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gap-1"
                    data-testid="button-form-save"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
          MyFloatingForm
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
