import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanza } from "@/hooks/use-finanza";
import { insertPagoFinanzaSchema, type PagoFinanza, type InsertPagoFinanza } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";
import { CalculatorDialog } from "@/components/CalculatorDialog";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/formatNumber";
import type { Central, Registro } from "@shared/schema";

interface PagosGridProps {
  filterFinca?: string;
  filterCentral?: string;
}

export function PagosGrid({ filterFinca, filterCentral }: PagosGridProps) {
  const { pagos, fincas, isLoaded, addPago, updatePago, deletePago, isMutating } = useFinanza();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPago, setEditingPago] = useState<PagoFinanza | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const form = useForm<InsertPagoFinanza>({
    resolver: zodResolver(insertPagoFinanzaSchema),
    defaultValues: {
      fecha: new Date().toISOString().split("T")[0],
      finca: "",
      central: "",
      comentario: "",
      monto: 0,
    },
  });

  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const { data: registros = [] } = useQuery<Registro[]>({
    queryKey: ["/api/registros"],
  });

  const fincasFromRegistros = Array.from(
    new Set(registros.map((r) => r.finca).filter((f): f is string => !!f))
  );
  const fincasFromConfig = fincas.map((f) => f.nombre);
  const fincaNames = ["Nucleo", ...Array.from(new Set([...fincasFromConfig, ...fincasFromRegistros])).sort()];

  const filteredPagos = pagos.filter((pago) => {
    if (filterFinca && pago.finca !== filterFinca) return false;
    if (filterCentral && pago.central !== filterCentral) return false;
    return true;
  });

  const resetForm = () => {
    form.reset({
      fecha: new Date().toISOString().split("T")[0],
      finca: "",
      central: "",
      comentario: "",
      monto: 0,
    });
    setEditingPago(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (pago: PagoFinanza) => {
    setEditingPago(pago);
    form.reset({
      fecha: pago.fecha,
      finca: pago.finca,
      central: pago.central,
      comentario: pago.comentario || "",
      monto: pago.monto,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertPagoFinanza) => {
    if (editingPago) {
      updatePago(editingPago.id, data);
      toast({
        title: "Actualizado",
        description: "Pago actualizado correctamente",
      });
    } else {
      addPago(data);
      toast({
        title: "Agregado",
        description: "Pago agregado correctamente",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deletePago(id);
    toast({
      title: "Eliminado",
      description: "Pago eliminado correctamente",
    });
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsDialogOpen(open);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" data-testid="text-pagos-title">
          Pagos
        </h2>
        <Button onClick={openAddDialog} data-testid="button-add-pago">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Pago
        </Button>
      </div>

      {filteredPagos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-pagos">
          No hay pagos registrados.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Finca</TableHead>
                <TableHead>Central</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Comentario</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPagos.map((pago) => (
                <TableRow key={pago.id} data-testid={`row-pago-${pago.id}`}>
                  <TableCell>{pago.fecha}</TableCell>
                  <TableCell className="font-medium">{pago.finca}</TableCell>
                  <TableCell>{pago.central}</TableCell>
                  <TableCell className="text-right">{formatNumber(pago.monto)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {pago.comentario || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          openEditDialog(pago);
                        }}
                        data-testid={`button-edit-pago-${pago.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDelete(pago.id);
                        }}
                        data-testid={`button-delete-pago-${pago.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPago ? "Editar Pago" : "Agregar Pago"}
            </DialogTitle>
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
                      <Input type="date" {...field} data-testid="input-pago-fecha" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finca</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-pago-finca">
                          <SelectValue placeholder="Seleccionar finca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fincaNames.map((finca) => (
                          <SelectItem key={finca} value={finca}>
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
                name="central"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Central</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-pago-central">
                          <SelectValue placeholder="Seleccionar central" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {centrales.map((central) => (
                          <SelectItem key={central.id} value={central.nombre}>
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
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-pago-monto"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setCalculatorOpen(true)}
                          data-testid="button-calculator-monto"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comentario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentario</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Comentario opcional"
                        data-testid="input-pago-comentario"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-pago"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-save-pago">
                  {editingPago ? "Guardar" : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CalculatorDialog
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        initialValue={form.getValues("monto")}
        onResult={(value) => {
          form.setValue("monto", value);
        }}
      />
    </div>
  );
}
