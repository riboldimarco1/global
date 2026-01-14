import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Calculator, Plus, Trash2 } from "lucide-react";
import type { Registro, Central, Finca } from "@shared/schema";

function capitalizeWords(text: string): string {
  if (!text) return text;
  return text
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  central: z.string().min(1, "Seleccione una central"),
  cantidad: z.string().min(1, "La cantidad es requerida").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "La cantidad debe ser un número positivo"
  ),
  grado: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "El grado debe ser un número positivo"
  ),
  finca: z.string().optional(),
  remesa: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditRegistroDialogProps {
  registro: Registro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordUpdated?: () => void;
}

export function EditRegistroDialog({ registro, open, onOpenChange, onRecordUpdated }: EditRegistroDialogProps) {
  const { toast } = useToast();
  const [cantidadCalcValues, setCantidadCalcValues] = useState<string[]>([""]);
  const [cantidadCalcOpen, setCantidadCalcOpen] = useState(false);
  const [gradoCalcValues, setGradoCalcValues] = useState<string[]>([""]);
  const [gradoCalcOpen, setGradoCalcOpen] = useState(false);
  const [remesaCalcValues, setRemesaCalcValues] = useState<string[]>([""]);
  const [remesaCalcOpen, setRemesaCalcOpen] = useState(false);
  
  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const { data: fincas = [] } = useQuery<Finca[]>({
    queryKey: ["/api/fincas"],
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: "",
      central: "",
      cantidad: "",
      grado: "",
      finca: "",
      remesa: "",
    },
  });

  useEffect(() => {
    if (registro && open) {
      form.reset({
        fecha: registro.fecha,
        central: registro.central,
        cantidad: registro.cantidad.toString(),
        grado: registro.grado?.toString() || "",
        finca: registro.finca || "",
        remesa: registro.remesa || "",
      });
    }
  }, [registro, open, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!registro) throw new Error("No registro to update");
      const payload = {
        fecha: data.fecha,
        central: data.central,
        cantidad: parseFloat(data.cantidad),
        grado: data.grado ? parseFloat(data.grado) : undefined,
        finca: data.finca ? capitalizeWords(data.finca) : undefined,
        remesa: data.remesa || undefined,
      };
      const response = await apiRequest("PUT", `/api/registros/${registro.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      toast({
        title: "Registro actualizado",
        description: "El registro se ha actualizado correctamente.",
      });
      onOpenChange(false);
      if (onRecordUpdated) {
        onRecordUpdated();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el registro. Intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  const cantidadCalcTotal = cantidadCalcValues.reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleCantidadCalcValueChange = (index: number, value: string) => {
    const newValues = [...cantidadCalcValues];
    newValues[index] = value;
    setCantidadCalcValues(newValues);
  };

  const addCantidadCalcRow = () => {
    setCantidadCalcValues([...cantidadCalcValues, ""]);
  };

  const removeCantidadCalcRow = (index: number) => {
    if (cantidadCalcValues.length > 1) {
      setCantidadCalcValues(cantidadCalcValues.filter((_, i) => i !== index));
    }
  };

  const applyCantidadCalcTotal = () => {
    if (cantidadCalcTotal > 0) {
      form.setValue("cantidad", cantidadCalcTotal.toFixed(2));
      setCantidadCalcOpen(false);
      setCantidadCalcValues([""]);
    }
  };

  const resetCantidadCalc = () => {
    setCantidadCalcValues([""]);
  };

  const gradoCalcTotal = gradoCalcValues.reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleGradoCalcValueChange = (index: number, value: string) => {
    const newValues = [...gradoCalcValues];
    newValues[index] = value;
    setGradoCalcValues(newValues);
  };

  const addGradoCalcRow = () => {
    setGradoCalcValues([...gradoCalcValues, ""]);
  };

  const removeGradoCalcRow = (index: number) => {
    if (gradoCalcValues.length > 1) {
      setGradoCalcValues(gradoCalcValues.filter((_, i) => i !== index));
    }
  };

  const applyGradoCalcTotal = () => {
    if (gradoCalcTotal > 0) {
      form.setValue("grado", gradoCalcTotal.toFixed(2));
      setGradoCalcOpen(false);
      setGradoCalcValues([""]);
    }
  };

  const resetGradoCalc = () => {
    setGradoCalcValues([""]);
  };

  const remesaCalcTotal = remesaCalcValues.reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleRemesaCalcValueChange = (index: number, value: string) => {
    const newValues = [...remesaCalcValues];
    newValues[index] = value;
    setRemesaCalcValues(newValues);
  };

  const addRemesaCalcRow = () => {
    setRemesaCalcValues([...remesaCalcValues, ""]);
  };

  const removeRemesaCalcRow = (index: number) => {
    if (remesaCalcValues.length > 1) {
      setRemesaCalcValues(remesaCalcValues.filter((_, i) => i !== index));
    }
  };

  const applyRemesaCalcTotal = () => {
    if (remesaCalcTotal > 0) {
      form.setValue("remesa", Math.round(remesaCalcTotal).toString());
      setRemesaCalcOpen(false);
      setRemesaCalcValues([""]);
    }
  };

  const resetRemesaCalc = () => {
    setRemesaCalcValues([""]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Registro</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-edit-fecha" />
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
                  <FormLabel>Central</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-central">
                        <SelectValue placeholder="Seleccionar central" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {centrales.map((central) => (
                        <SelectItem key={central.id} value={central.nombre} data-testid={`option-edit-${central.nombre.toLowerCase()}`}>
                          {central.nombre}
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
                  <FormLabel>Cantidad</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder="0.00"
                        className="text-right tabular-nums"
                        {...field}
                        data-testid="input-edit-cantidad"
                      />
                    </FormControl>
                    <Popover open={cantidadCalcOpen} onOpenChange={setCantidadCalcOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" data-testid="button-edit-cantidad-calculator">
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Calculadora</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={resetCantidadCalc} className="h-7 text-xs">Limpiar</Button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cantidadCalcValues.map((value, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[.,]?[0-9]*"
                                  placeholder="0.00"
                                  value={value}
                                  onChange={(e) => handleCantidadCalcValueChange(index, e.target.value)}
                                  className="text-right tabular-nums"
                                />
                                {cantidadCalcValues.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCantidadCalcRow(index)} className="h-8 w-8 shrink-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addCantidadCalcRow} className="w-full gap-1">
                            <Plus className="h-3 w-3" />
                            Agregar fila
                          </Button>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Total: <span className="tabular-nums">{formatNumber(cantidadCalcTotal)}</span></span>
                            <Button type="button" size="sm" onClick={applyCantidadCalcTotal} disabled={cantidadCalcTotal <= 0}>Aplicar</Button>
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
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder="0.00"
                        className="text-right tabular-nums"
                        {...field}
                        data-testid="input-edit-grado"
                      />
                    </FormControl>
                    <Popover open={gradoCalcOpen} onOpenChange={setGradoCalcOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" data-testid="button-edit-grado-calculator">
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Calculadora</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={resetGradoCalc} className="h-7 text-xs">Limpiar</Button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {gradoCalcValues.map((value, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[.,]?[0-9]*"
                                  placeholder="0.00"
                                  value={value}
                                  onChange={(e) => handleGradoCalcValueChange(index, e.target.value)}
                                  className="text-right tabular-nums"
                                />
                                {gradoCalcValues.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeGradoCalcRow(index)} className="h-8 w-8 shrink-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addGradoCalcRow} className="w-full gap-1">
                            <Plus className="h-3 w-3" />
                            Agregar fila
                          </Button>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Total: <span className="tabular-nums">{formatNumber(gradoCalcTotal)}</span></span>
                            <Button type="button" size="sm" onClick={applyGradoCalcTotal} disabled={gradoCalcTotal <= 0}>Aplicar</Button>
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
              name="finca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Finca (opcional)</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-finca">
                        <SelectValue placeholder="Seleccione una finca" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Sin finca</SelectItem>
                      {fincas.map((finca) => (
                        <SelectItem key={finca.id} value={finca.nombre} data-testid={`option-edit-finca-${finca.nombre.toLowerCase()}`}>
                          {finca.nombre}
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
              name="remesa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remesa (opcional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Número de remesa"
                        {...field}
                        data-testid="input-edit-remesa"
                        className="text-right tabular-nums"
                      />
                    </FormControl>
                    <Popover open={remesaCalcOpen} onOpenChange={setRemesaCalcOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" data-testid="button-edit-remesa-calculator">
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Calculadora</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={resetRemesaCalc} className="h-7 text-xs">Limpiar</Button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {remesaCalcValues.map((value, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                  value={value}
                                  onChange={(e) => handleRemesaCalcValueChange(index, e.target.value)}
                                  className="text-right tabular-nums"
                                  data-testid={`input-edit-remesa-calc-${index}`}
                                />
                                {remesaCalcValues.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRemesaCalcRow(index)} className="h-8 w-8 shrink-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addRemesaCalcRow} className="w-full gap-1" data-testid="button-add-edit-remesa-row">
                            <Plus className="h-3 w-3" />
                            Agregar fila
                          </Button>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Total: <span className="tabular-nums">{Math.round(remesaCalcTotal)}</span></span>
                            <Button type="button" size="sm" onClick={applyRemesaCalcTotal} disabled={remesaCalcTotal <= 0} data-testid="button-apply-edit-remesa-calc">Aplicar</Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
