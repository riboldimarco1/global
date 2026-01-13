import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Trash2, Key } from "lucide-react";
import { getWeekStartDate, setWeekStartDate } from "@/lib/weekUtils";
import { setAdminPassword, validateAdminPassword } from "@/lib/auth";
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handleChangePassword = () => {
    if (!validateAdminPassword(currentPassword)) {
      toast({
        title: "Error",
        description: "La contraseña actual es incorrecta.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 4) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe tener al menos 4 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      });
      return;
    }
    setAdminPassword(newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({
      title: "Contraseña actualizada",
      description: "La contraseña de administrador ha sido cambiada exitosamente.",
    });
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
        
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de inicio de Semana 1</Label>
            <div className="flex gap-2">
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
              <Button onClick={handleSaveStartDate} data-testid="button-save-settings">
                Guardar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Las semanas se calcularán a partir de esta fecha.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <Label>Cambiar contraseña de administrador</Label>
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Contraseña actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
              <Input
                type="password"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
              <Input
                type="password"
                placeholder="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
              <Button 
                onClick={handleChangePassword} 
                className="w-full"
                disabled={!currentPassword || !newPassword || !confirmPassword}
                data-testid="button-change-password"
              >
                Cambiar contraseña
              </Button>
            </div>
          </div>

          <Separator />

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
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-close-settings">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
