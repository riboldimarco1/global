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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Save, Loader2, Calculator, ChevronDown } from "lucide-react";
import { NumericKeypad } from "@/components/NumericKeypad";

import type { Registro, InsertRegistro, Central } from "@shared/schema";

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
  fincas?: string[];
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

export function RegistroForm({ onRecordCreated, isOnline = true, fincas = [] }: RegistroFormProps) {
  const { toast } = useToast();
  const [calcValue, setCalcValue] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [gradoCalcValue, setGradoCalcValue] = useState("");
  const [gradoCalcOpen, setGradoCalcOpen] = useState(false);
  const [remesaCalcValue, setRemesaCalcValue] = useState("");
  const [remesaCalcOpen, setRemesaCalcOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const { createRegistroOffline } = useOnlineStatus();
  
  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
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

  const applyCalcValue = () => {
    const normalizedValue = calcValue.replace(",", ".");
    const num = parseFloat(normalizedValue);
    if (!isNaN(num) && num > 0) {
      form.setValue("cantidad", num.toFixed(2));
      setCalcOpen(false);
      setCalcValue("");
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
    <Collapsible open={formOpen} onOpenChange={setFormOpen}>
      <Card className="w-full max-w-md mx-auto">
        <CollapsibleTrigger asChild>
          <CardHeader 
            className="pb-4 cursor-pointer"
            data-testid="button-toggle-nuevo-registro"
          >
            <CardTitle className="flex items-center justify-between text-xl font-semibold">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Nuevo Registro
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${formOpen ? 'rotate-0' : '-rotate-90'}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
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
                      <PopoverContent className="w-auto p-2" align="end">
                        <div className="space-y-2">
                          <div className="text-right px-2 py-1 bg-muted rounded text-lg font-mono min-h-[32px]">
                            {calcValue || "0"}
                          </div>
                          <NumericKeypad
                            value={calcValue}
                            onChange={setCalcValue}
                            onApply={applyCalcValue}
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
                      <SelectTrigger data-testid="select-finca">
                        <SelectValue placeholder="Seleccione una finca" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Sin finca</SelectItem>
                      {fincas.map((finca) => (
                        <SelectItem key={finca} value={finca} data-testid={`option-finca-${finca.toLowerCase()}`}>
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
