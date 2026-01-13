import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Trash2 } from "lucide-react";
import { getWeekStartDate, setWeekStartDate } from "@/lib/weekUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { clearAllData as clearLocalData } from "@/lib/db";

interface SettingsDialogProps {
  onSettingsChanged: () => void;
}

export function SettingsDialog({ onSettingsChanged }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const currentStart = getWeekStartDate();
  const [startDate, setStartDate] = useState(() => {
    const { year, month, day } = currentStart;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  const handleSaveStartDate = () => {
    const [year, month, day] = startDate.split('-').map(Number);
    if (year && month && day) {
      setWeekStartDate(year, month, day);
      toast({
        title: "Configuración guardada",
        description: `La semana 1 ahora comienza el ${day}/${month}/${year}`,
      });
      onSettingsChanged();
      setOpen(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", "/api/registros");
      await clearLocalData();
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      toast({
        title: "Datos eliminados",
        description: "Todos los registros han sido eliminados del servidor y almacenamiento local.",
      });
      onSettingsChanged();
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar los datos del servidor.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>
            Ajusta la fecha de inicio de la semana 1 y gestiona los datos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de inicio de Semana 1</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-testid="input-start-date"
            />
            <p className="text-sm text-muted-foreground">
              Las semanas se calcularán a partir de esta fecha.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Eliminar todos los datos</Label>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full gap-2"
                  data-testid="button-delete-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar todos los registros
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará permanentemente todos los registros del servidor y del almacenamiento local. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllData}
                    disabled={isDeleting}
                    data-testid="button-confirm-delete"
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar todo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-sm text-muted-foreground">
              Elimina todos los registros del servidor y almacenamiento local.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-settings">
            Cancelar
          </Button>
          <Button onClick={handleSaveStartDate} data-testid="button-save-settings">
            Guardar fecha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
