import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { Registro } from "@shared/schema";

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

interface EditRegistroDialogProps {
  registro: Registro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordUpdated?: () => void;
}

export function EditRegistroDialog({ registro, open, onOpenChange, onRecordUpdated }: EditRegistroDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: "",
      central: undefined,
      cantidad: "",
      grado: "",
    },
  });

  useEffect(() => {
    if (registro && open) {
      form.reset({
        fecha: registro.fecha,
        central: registro.central as typeof CENTRALES[number],
        cantidad: registro.cantidad.toString(),
        grado: registro.grado?.toString() || "",
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
                      {CENTRALES.map((central) => (
                        <SelectItem key={central} value={central} data-testid={`option-edit-${central.toLowerCase()}`}>
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
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-edit-cantidad"
                    />
                  </FormControl>
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
                      placeholder="0.00"
                      {...field}
                      data-testid="input-edit-grado"
                    />
                  </FormControl>
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
