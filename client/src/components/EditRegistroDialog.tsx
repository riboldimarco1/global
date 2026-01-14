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
import { Loader2, Calculator } from "lucide-react";
import { NumericKeypad } from "@/components/NumericKeypad";
import type { Registro, Central } from "@shared/schema";

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
  const [cantidadCalcValue, setCantidadCalcValue] = useState("");
  const [cantidadCalcOpen, setCantidadCalcOpen] = useState(false);
  const [gradoCalcValue, setGradoCalcValue] = useState("");
  const [gradoCalcOpen, setGradoCalcOpen] = useState(false);
  const [remesaCalcValue, setRemesaCalcValue] = useState("");
  const [remesaCalcOpen, setRemesaCalcOpen] = useState(false);
  
  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const { data: allRegistros = [] } = useQuery<Registro[]>({
    queryKey: ["/api/registros"],
  });

  const fincas = Array.from(
    new Set(allRegistros.map(r => r.finca).filter((f): f is string => !!f))
  ).sort();
  
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

  const applyCantidadCalcValue = () => {
    const normalizedValue = cantidadCalcValue.replace(",", ".");
    const num = parseFloat(normalizedValue);
    if (!isNaN(num) && num > 0) {
      form.setValue("cantidad", num.toFixed(2));
      setCantidadCalcOpen(false);
      setCantidadCalcValue("");
    }
  };

  const applyGradoCalcValue = () => {
    const normalizedValue = gradoCalcValue.replace(",", ".");
    const num = parseFloat(normalizedValue);
    if (!isNaN(num) && num >= 0) {
      form.setValue("grado", num.toFixed(2));
      setGradoCalcOpen(false);
      setGradoCalcValue("");
    }
  };

  const applyRemesaCalcValue = () => {
    const normalizedValue = remesaCalcValue.replace(",", ".");
    const num = parseFloat(normalizedValue);
    if (!isNaN(num) && num > 0) {
      form.setValue("remesa", Math.round(num).toString());
      setRemesaCalcOpen(false);
      setRemesaCalcValue("");
    }
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
                      <PopoverContent className="w-auto p-2" align="end">
                        <div className="space-y-2">
                          <div className="text-right px-2 py-1 bg-muted rounded text-lg font-mono min-h-[32px]">
                            {cantidadCalcValue || "0"}
                          </div>
                          <NumericKeypad
                            value={cantidadCalcValue}
                            onChange={setCantidadCalcValue}
                            onApply={applyCantidadCalcValue}
                          />
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
                      <PopoverContent className="w-auto p-2" align="end">
                        <div className="space-y-2">
                          <div className="text-right px-2 py-1 bg-muted rounded text-lg font-mono min-h-[32px]">
                            {gradoCalcValue || "0"}
                          </div>
                          <NumericKeypad
                            value={gradoCalcValue}
                            onChange={setGradoCalcValue}
                            onApply={applyGradoCalcValue}
                          />
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
                        <SelectItem key={finca} value={finca} data-testid={`option-edit-finca-${finca.toLowerCase()}`}>
                          {finca}
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
                      <PopoverContent className="w-auto p-2" align="end">
                        <div className="space-y-2">
                          <div className="text-right px-2 py-1 bg-muted rounded text-lg font-mono min-h-[32px]">
                            {remesaCalcValue || "0"}
                          </div>
                          <NumericKeypad
                            value={remesaCalcValue}
                            onChange={setRemesaCalcValue}
                            onApply={applyRemesaCalcValue}
                          />
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
