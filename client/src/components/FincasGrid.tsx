import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanza } from "@/hooks/use-finanza";
import { CalculatorDialog } from "@/components/CalculatorDialog";
import { insertFincaFinanzaSchema, type FincaFinanza, type InsertFincaFinanza } from "@shared/schema";
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
import { Plus, Calculator, Pencil } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/formatNumber";
import type { Registro, Central } from "@shared/schema";

type CalculatorField = "costoCosecha" | "compFlete" | "valorTonAzucar" | "valorMelazaTc" | null;

export function FincasGrid() {
  const { fincas, isLoaded, addFinca, updateFinca, deleteFinca, isMutating } = useFinanza();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFinca, setEditingFinca] = useState<FincaFinanza | null>(null);
  const [calculatorField, setCalculatorField] = useState<CalculatorField>(null);

  const form = useForm<InsertFincaFinanza>({
    resolver: zodResolver(insertFincaFinanzaSchema),
    defaultValues: {
      nombre: "",
      central: "",
      costoCosecha: 0,
      compFlete: 0,
      valorTonAzucar: 0,
      valorMelazaTc: 0,
    },
  });

  const { data: registros = [] } = useQuery<Registro[]>({
    queryKey: ["/api/registros"],
  });

  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const fincasFromRegistros = Array.from(
    new Set(registros.map((r) => r.finca).filter((f): f is string => !!f))
  ).sort();

  const resetForm = () => {
    form.reset({
      nombre: "",
      central: "",
      costoCosecha: 0,
      compFlete: 0,
      valorTonAzucar: 0,
      valorMelazaTc: 0,
    });
    setEditingFinca(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (finca: FincaFinanza) => {
    setEditingFinca(finca);
    form.reset({
      nombre: finca.nombre,
      central: finca.central,
      costoCosecha: finca.costoCosecha,
      compFlete: finca.compFlete,
      valorTonAzucar: finca.valorTonAzucar,
      valorMelazaTc: finca.valorMelazaTc,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertFincaFinanza) => {
    if (editingFinca) {
      updateFinca(editingFinca.id, data);
      toast({
        title: "Actualizado",
        description: "Finca actualizada correctamente",
      });
    } else {
      addFinca(data);
      toast({
        title: "Agregado",
        description: "Finca agregada correctamente",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteFinca(id);
    toast({
      title: "Eliminado",
      description: "Finca eliminada correctamente",
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
        <h2 className="text-xl font-semibold" data-testid="text-fincas-title">
          Fincas
        </h2>
        <Button onClick={openAddDialog} data-testid="button-add-finca">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Finca
        </Button>
      </div>

      {fincas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-fincas">
          No hay fincas registradas. Haga clic en "Agregar Finca" para comenzar.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Central</TableHead>
                <TableHead className="text-right">Costo Cosecha</TableHead>
                <TableHead className="text-right">Comp. Flete</TableHead>
                <TableHead className="text-right">Valor Ton. Azúcar</TableHead>
                <TableHead className="text-right">Valor Melaza/TC</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fincas.map((finca) => (
                <TableRow key={finca.id} data-testid={`row-finca-${finca.id}`}>
                  <TableCell className="font-medium">{finca.nombre}</TableCell>
                  <TableCell>{finca.central}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(finca.costoCosecha)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(finca.compFlete)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(finca.valorTonAzucar)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(finca.valorMelazaTc)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(finca)}
                        data-testid={`button-edit-finca-${finca.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteConfirmDialog
                        onConfirm={() => handleDelete(finca.id)}
                        description={`¿Está seguro de eliminar "${finca.nombre}"?`}
                        testId={`button-delete-finca-${finca.id}`}
                      />
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
              {editingFinca ? "Editar Finca" : "Agregar Finca"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-finca-nombre">
                          <SelectValue placeholder="Seleccionar finca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fincasFromRegistros.map((finca) => (
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
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (!editingFinca) {
                          const lastFincaForCentral = fincas
                            .filter(f => f.central === value)
                            .sort((a, b) => b.id.localeCompare(a.id))[0];
                          if (lastFincaForCentral) {
                            form.setValue("costoCosecha", lastFincaForCentral.costoCosecha);
                            form.setValue("compFlete", lastFincaForCentral.compFlete);
                            form.setValue("valorTonAzucar", lastFincaForCentral.valorTonAzucar);
                            form.setValue("valorMelazaTc", lastFincaForCentral.valorMelazaTc);
                          }
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-finca-central">
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
                name="costoCosecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Cosecha</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-costo-cosecha"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setCalculatorField("costoCosecha")}
                          data-testid="button-calculator-costo-cosecha"
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
                name="compFlete"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comp. Flete</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-comp-flete"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setCalculatorField("compFlete")}
                          data-testid="button-calculator-comp-flete"
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
                name="valorTonAzucar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Ton. Azúcar</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-valor-ton-azucar"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setCalculatorField("valorTonAzucar")}
                          data-testid="button-calculator-valor-ton-azucar"
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
                name="valorMelazaTc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Melaza/TC</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-valor-melaza-tc"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setCalculatorField("valorMelazaTc")}
                          data-testid="button-calculator-valor-melaza-tc"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
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
                  data-testid="button-cancel-finca"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-save-finca">
                  {editingFinca ? "Guardar" : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CalculatorDialog
        open={calculatorField !== null}
        onOpenChange={(open) => {
          if (!open) setCalculatorField(null);
        }}
        initialValue={calculatorField ? form.getValues(calculatorField) : 0}
        onResult={(value) => {
          if (calculatorField) {
            form.setValue(calculatorField, value);
          }
        }}
      />
    </div>
  );
}
