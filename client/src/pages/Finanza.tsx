import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { FincasGrid } from "@/components/FincasGrid";
import { PagosGrid } from "@/components/PagosGrid";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocalFinanza } from "@/hooks/use-local-finanza";
import type { Registro, Central } from "@shared/schema";

interface FinanzaProps {
  onBack: () => void;
}

interface EstadoCuentaItem {
  fecha: string;
  finca: string;
  central: string;
  cantidad: number;
  gradoOriginal: number | null;
  gradoAjustado: number;
  ingresoAzucar: number;
  ingresoMelaza: number;
  ingresoFlete: number;
  ingresoTotal: number;
}

export default function Finanza({ onBack }: FinanzaProps) {
  const [filterFinca, setFilterFinca] = useState<string>("");
  const [filterCentral, setFilterCentral] = useState<string>("");
  const [estadoCuentaOpen, setEstadoCuentaOpen] = useState(false);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaItem[]>([]);

  const { fincas } = useLocalFinanza();

  const { data: registros = [] } = useQuery<Registro[]>({
    queryKey: ["/api/registros"],
  });

  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const fincasFromRegistros = Array.from(
    new Set(registros.map((r) => r.finca).filter((f): f is string => !!f))
  );
  const fincasFromConfig = fincas.map((f) => f.nombre);
  const fincaNames = Array.from(new Set([...fincasFromConfig, ...fincasFromRegistros])).sort();

  const generateEstadoCuenta = () => {
    const items: EstadoCuentaItem[] = [];

    const filteredRegistros = registros.filter((r) => {
      if (filterFinca && r.finca !== filterFinca) return false;
      if (filterCentral && r.central !== filterCentral) return false;
      return true;
    });

    const palmarRegistros = filteredRegistros.filter(
      (r) => r.central.toLowerCase() === "palmar"
    );
    let palmarFirstDate: Date | null = null;
    if (palmarRegistros.length > 0) {
      const dates = palmarRegistros.map((r) => new Date(r.fecha));
      palmarFirstDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    }

    for (const registro of filteredRegistros) {
      const fincaConfig = fincas.find(
        (f) => f.nombre === registro.finca && f.central === registro.central
      );

      if (!fincaConfig) continue;

      const registroDate = new Date(registro.fecha);
      let gradoAjustado = registro.grado ?? 0;

      if (registro.central.toLowerCase() === "palmar" && palmarFirstDate) {
        const sixWeeksLater = new Date(palmarFirstDate);
        sixWeeksLater.setDate(sixWeeksLater.getDate() + 6 * 7);

        if (registroDate < sixWeeksLater) {
          gradoAjustado = 8.3;
        }
      }

      const cantidad = registro.cantidad;
      const ingresoAzucar = cantidad * gradoAjustado * fincaConfig.valorTonAzucar;
      const ingresoMelaza = cantidad * fincaConfig.valorMelazaTc;
      const ingresoFlete = cantidad * fincaConfig.compFlete;
      const ingresoTotal = ingresoAzucar + ingresoMelaza + ingresoFlete;

      items.push({
        fecha: registro.fecha,
        finca: registro.finca || "",
        central: registro.central,
        cantidad,
        gradoOriginal: registro.grado,
        gradoAjustado,
        ingresoAzucar,
        ingresoMelaza,
        ingresoFlete,
        ingresoTotal,
      });
    }

    items.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    setEstadoCuenta(items);
    setEstadoCuentaOpen(true);
  };

  const totalIngreso = estadoCuenta.reduce((sum, item) => sum + item.ingresoTotal, 0);

  const clearFilter = (filter: "finca" | "central") => {
    if (filter === "finca") {
      setFilterFinca("");
    } else {
      setFilterCentral("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="button-back-to-modules"
          title="Volver a módulos"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </Header>
      <main className="container px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <h1
          className="text-3xl font-bold text-foreground mb-6"
          data-testid="text-finanza-title"
        >
          Finanza
        </h1>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Finca:</span>
            <Select value={filterFinca} onValueChange={setFilterFinca}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-finca">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                {fincaNames.map((finca) => (
                  <SelectItem key={finca} value={finca}>
                    {finca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterFinca && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => clearFilter("finca")}
                data-testid="button-clear-filter-finca"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Central:</span>
            <Select value={filterCentral} onValueChange={setFilterCentral}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-central">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                {centrales.map((central) => (
                  <SelectItem key={central.id} value={central.nombre}>
                    {central.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterCentral && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => clearFilter("central")}
                data-testid="button-clear-filter-central"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Button
            onClick={generateEstadoCuenta}
            data-testid="button-generar-estado-cuenta"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar Estado de Cuenta
          </Button>
        </div>

        <div className="space-y-8">
          <FincasGrid />
          <PagosGrid filterFinca={filterFinca} filterCentral={filterCentral} />
        </div>
      </main>

      <Dialog open={estadoCuentaOpen} onOpenChange={setEstadoCuentaOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Estado de Cuenta</DialogTitle>
          </DialogHeader>
          {estadoCuenta.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay registros que coincidan con los filtros seleccionados o
              no hay configuración de fincas asociada.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Finca</TableHead>
                      <TableHead>Central</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Grado Orig.</TableHead>
                      <TableHead className="text-right">Grado Ajust.</TableHead>
                      <TableHead className="text-right">Ing. Azúcar</TableHead>
                      <TableHead className="text-right">Ing. Melaza</TableHead>
                      <TableHead className="text-right">Ing. Flete</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadoCuenta.map((item, index) => (
                      <TableRow key={index} data-testid={`row-estado-cuenta-${index}`}>
                        <TableCell>{item.fecha}</TableCell>
                        <TableCell className="font-medium">{item.finca}</TableCell>
                        <TableCell>{item.central}</TableCell>
                        <TableCell className="text-right">
                          {item.cantidad.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.gradoOriginal?.toFixed(2) ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.gradoAjustado.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.ingresoAzucar.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.ingresoMelaza.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.ingresoFlete.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.ingresoTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="text-lg font-bold" data-testid="text-total-ingreso">
                  Total: {totalIngreso.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
