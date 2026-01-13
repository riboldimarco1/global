import { useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Trash2, Database, AlertCircle } from "lucide-react";
import type { Registro } from "@shared/schema";

interface RegistrosGridProps {
  registros: Registro[];
  isLoading: boolean;
  selectedWeek: number;
  isOnline?: boolean;
  onRecordDeleted?: (id: string) => void;
  canDelete?: boolean;
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getCentralColor(central: string): "default" | "secondary" | "outline" {
  switch (central) {
    case "Palmar":
      return "default";
    case "Portuguesa":
      return "secondary";
    case "Pastora":
      return "outline";
    default:
      return "outline";
  }
}

function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function RegistrosGrid({ registros, isLoading, selectedWeek, isOnline = true, onRecordDeleted, canDelete = true }: RegistrosGridProps) {
  const { toast } = useToast();
  const { deleteRegistroOffline } = useOnlineStatus();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/registros/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      toast({
        title: "Registro eliminado",
        description: "El registro se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este registro?")) {
      if (isOnline) {
        deleteMutation.mutate(id);
      } else {
        try {
          await deleteRegistroOffline(id);
          if (onRecordDeleted) {
            onRecordDeleted(id);
          }
          toast({
            title: "Eliminado localmente",
            description: "El cambio se sincronizará cuando vuelva la conexión.",
          });
        } catch {
          toast({
            title: "Error",
            description: "No se pudo eliminar el registro.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const totalCantidad = registros.reduce((sum, r) => sum + r.cantidad, 0);
  const registrosConGrado = registros.filter(r => r.grado !== null && r.grado !== undefined);
  const cantidadConGrado = registrosConGrado.reduce((sum, r) => sum + r.cantidad, 0);
  const avgGrado = cantidadConGrado > 0 
    ? registrosConGrado.reduce((sum, r) => sum + (r.cantidad * (r.grado ?? 0)), 0) / cantidadConGrado 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Registros de la Semana {selectedWeek}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (registros.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Registros de la Semana {selectedWeek}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay registros</h3>
            <p className="text-muted-foreground max-w-sm">
              No se encontraron registros para la semana {selectedWeek}. 
              Use el formulario para agregar nuevos registros.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Registros de la Semana {selectedWeek}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <span className="text-muted-foreground mr-1">Total:</span>
              <span className="font-semibold tabular-nums" data-testid="text-total-cantidad">
                {formatNumber(totalCantidad)}
              </span>
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <span className="text-muted-foreground mr-1">Prom. Grado:</span>
              <span className="font-semibold tabular-nums" data-testid="text-avg-grado">
                {formatNumber(avgGrado)}
              </span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Central</TableHead>
                <TableHead className="font-semibold text-right">Cantidad</TableHead>
                <TableHead className="font-semibold text-right">Grado</TableHead>
                {canDelete && <TableHead className="w-[60px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map((registro, index) => (
                <TableRow 
                  key={registro.id} 
                  className="hover-elevate"
                  data-testid={`row-registro-${index}`}
                >
                  <TableCell className="font-medium" data-testid={`text-fecha-${index}`}>
                    {formatDateDisplay(registro.fecha)}
                  </TableCell>
                  <TableCell data-testid={`text-central-${index}`}>
                    <Badge variant={getCentralColor(registro.central)}>
                      {registro.central}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium" data-testid={`text-cantidad-${index}`}>
                    {formatNumber(registro.cantidad)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium" data-testid={`text-grado-${index}`}>
                    {registro.grado !== null ? formatNumber(registro.grado) : "-"}
                  </TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(registro.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${index}`}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
