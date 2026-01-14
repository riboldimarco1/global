import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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

import type { Registro, InsertRegistro, Central, Finca } from "@shared/schema";

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
import { useOnlineStatus } from "@/hooks/use-online-status";

interface RegistroFormProps {
  onRecordCreated?: (fecha: string, newRegistro?: Registro) => void;
  isOnline?: boolean;
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

export function RegistroForm({ onRecordCreated, isOnline = true }: RegistroFormProps) {
  const { toast } = useToast();
  const [calcValues, setCalcValues] = useState<string[]>([""]);
  const [calcOpen, setCalcOpen] = useState(false);
  const [gradoCalcValues, setGradoCalcValues] = useState<string[]>([""]);
  const [gradoCalcOpen, setGradoCalcOpen] = useState(false);
  const [remesaCalcValues, setRemesaCalcValues] = useState<string[]>([""]);
  const [remesaCalcOpen, setRemesaCalcOpen] = useState(false);
  const { createRegistroOffline } = useOnlineStatus();
  
  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const { data: fincas = [] } = useQuery<Finca[]>({
    queryKey: ["/api/fincas"],
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      central: undefined,
      cantidad: "",
      grado: "",
      finca: "",
      remesa: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        fecha: data.fecha,
        central: data.central,
        cantidad: parseFloat(data.cantidad),
        grado: data.grado ? parseFloat(data.grado) : undefined,
        finca: data.finca ? capitalizeWords(data.finca) : undefined,
        remesa: data.remesa || undefined,
      };
      const response = await apiRequest("POST", "/api/registros", payload);
      const newRegistro = await response.json();
      return { newRegistro, fecha: data.fecha };
    },
    onSuccess: ({ newRegistro, fecha }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      toast({
        title: "Registro guardado",
        description: "El registro se ha guardado en la nube.",
      });
      if (onRecordCreated) {
        onRecordCreated(fecha, newRegistro);
      }
      form.reset({
        fecha: new Date().toISOString().split('T')[0],
        central: undefined,
        cantidad: "",
        grado: "",
        finca: "",
        remesa: "",
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

  const onSubmit = async (data: FormData) => {
    if (isOnline) {
      createMutation.mutate(data);
    } else {
      const payload: InsertRegistro = {
        fecha: data.fecha,
        central: data.central,
        cantidad: parseFloat(data.cantidad),
        grado: data.grado ? parseFloat(data.grado) : undefined,
        finca: data.finca ? capitalizeWords(data.finca) : undefined,
        remesa: data.remesa || undefined,
      };
      try {
        const newRegistro = await createRegistroOffline(payload);
        toast({
          title: "Guardado localmente",
          description: "El registro se sincronizará cuando vuelva la conexión.",
        });
        if (onRecordCreated) {
          onRecordCreated(data.fecha, newRegistro);
        }
        form.reset({
          fecha: new Date().toISOString().split('T')[0],
          central: undefined,
          cantidad: "",
          grado: "",
          finca: "",
          remesa: "",
        });
      } catch {
        toast({
          title: "Error",
          description: "No se pudo guardar el registro localmente.",
          variant: "destructive",
        });
      }
    }
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
                      {centrales.map((central) => (
                        <SelectItem key={central.id} value={central.nombre} data-testid={`option-central-${central.nombre.toLowerCase()}`}>
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
                  <FormLabel>Cantidad *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
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
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[.,]?[0-9]*"
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
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder="0.00"
                        data-testid="input-grado"
                        className="text-right tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <Popover open={gradoCalcOpen} onOpenChange={setGradoCalcOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          data-testid="button-grado-calculator"
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
                              onClick={resetGradoCalc}
                              className="h-7 text-xs"
                            >
                              Limpiar
                            </Button>
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
                                  data-testid={`input-grado-calc-${index}`}
                                />
                                {gradoCalcValues.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeGradoCalcRow(index)}
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
                            onClick={addGradoCalcRow}
                            className="w-full gap-1"
                            data-testid="button-add-grado-row"
                          >
                            <Plus className="h-3 w-3" />
                            Agregar fila
                          </Button>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">
                              Total: <span className="tabular-nums">{formatNumber(gradoCalcTotal)}</span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={applyGradoCalcTotal}
                              disabled={gradoCalcTotal <= 0}
                              data-testid="button-apply-grado-calc"
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
              name="finca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Finca (opcional)</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-finca">
                        <SelectValue placeholder="Seleccione una finca" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Sin finca</SelectItem>
                      {fincas.map((finca) => (
                        <SelectItem key={finca.id} value={finca.nombre} data-testid={`option-finca-${finca.nombre.toLowerCase()}`}>
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
                        data-testid="input-remesa"
                        className="text-right tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <Popover open={remesaCalcOpen} onOpenChange={setRemesaCalcOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          data-testid="button-remesa-calculator"
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
                              onClick={resetRemesaCalc}
                              className="h-7 text-xs"
                            >
                              Limpiar
                            </Button>
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
                                  data-testid={`input-remesa-calc-${index}`}
                                />
                                {remesaCalcValues.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRemesaCalcRow(index)}
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
                            onClick={addRemesaCalcRow}
                            className="w-full gap-1"
                            data-testid="button-add-remesa-row"
                          >
                            <Plus className="h-3 w-3" />
                            Agregar fila
                          </Button>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">
                              Total: <span className="tabular-nums">{Math.round(remesaCalcTotal)}</span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={applyRemesaCalcTotal}
                              disabled={remesaCalcTotal <= 0}
                              data-testid="button-apply-remesa-calc"
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
