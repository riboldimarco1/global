import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Save, Loader2, Calculator, Plus, Trash2 } from "lucide-react";

const CENTRALES = ["Palmar", "Portuguesa", "Pastora", "Otros"] as const;

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  central: z.enum(CENTRALES, { errorMap: () => ({ message: "Seleccione una central" }) }),
  cantidad: z.string().min(1, "La cantidad es requerida").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "La cantidad debe ser un número positivo"
  ),
  grado: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "El grado debe ser un número positivo"
  ),
});

type FormData = z.infer<typeof formSchema>;

interface RegistroFormProps {
  onRecordCreated?: (fecha: string) => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RegistroForm({ onRecordCreated }: RegistroFormProps) {
  const { toast } = useToast();
  const [calcValues, setCalcValues] = useState<string[]>([""]);
  const [calcOpen, setCalcOpen] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      central: undefined,
      cantidad: "",
      grado: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        fecha: data.fecha,
        central: data.central,
        cantidad: parseFloat(data.cantidad),
        grado: data.grado ? parseFloat(data.grado) : undefined,
      };
      return apiRequest("POST", "/api/registros", payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      toast({
        title: "Registro guardado",
        description: "El registro se ha guardado correctamente.",
      });
      if (onRecordCreated) {
        onRecordCreated(variables.fecha);
      }
      form.reset({
        fecha: new Date().toISOString().split('T')[0],
        central: undefined,
        cantidad: "",
        grado: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el registro. Intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const calcTotal = calcValues.reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleCalcValueChange = (index: number, value: string) => {
    const newValues = [...calcValues];
    newValues[index] = value;
    setCalcValues(newValues);
  };

  const addCalcRow = () => {
    setCalcValues([...calcValues, ""]);
  };

  const removeCalcRow = (index: number) => {
    if (calcValues.length > 1) {
      setCalcValues(calcValues.filter((_, i) => i !== index));
    }
  };

  const applyCalcTotal = () => {
    if (calcTotal > 0) {
      form.setValue("cantidad", calcTotal.toFixed(2));
      setCalcOpen(false);
      setCalcValues([""]);
    }
  };

  const resetCalc = () => {
    setCalcValues([""]);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Calendar className="h-5 w-5 text-primary" />
          Nuevo Registro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-fecha"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="central"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Central *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-central">
                        <SelectValue placeholder="Seleccione una central" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CENTRALES.map((central) => (
                        <SelectItem key={central} value={central} data-testid={`option-central-${central.toLowerCase()}`}>
                          {central}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cantidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        data-testid="input-cantidad"
                        className="text-right tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <Popover open={calcOpen} onOpenChange={setCalcOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          data-testid="button-calculator"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Calculadora</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={resetCalc}
                              className="h-7 text-xs"
                            >
                              Limpiar
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {calcValues.map((value, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={value}
                                  onChange={(e) => handleCalcValueChange(index, e.target.value)}
                                  className="text-right tabular-nums"
                                  data-testid={`input-calc-${index}`}
                                />
                                {calcValues.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeCalcRow(index)}
                                    className="h-8 w-8 shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCalcRow}
                            className="w-full gap-1"
                            data-testid="button-add-row"
                          >
                            <Plus className="h-3 w-3" />
                            Agregar fila
                          </Button>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">
                              Total: <span className="tabular-nums">{formatNumber(calcTotal)}</span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={applyCalcTotal}
                              disabled={calcTotal <= 0}
                              data-testid="button-apply-calc"
                            >
                              Aplicar
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grado (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      data-testid="input-grado"
                      className="text-right tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full mt-6"
              disabled={createMutation.isPending}
              data-testid="button-guardar"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Registro
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
