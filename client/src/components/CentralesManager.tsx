import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import type { Central } from "@shared/schema";

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

const DEFAULT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export function CentralesManager() {
  const { toast } = useToast();
  const [newNombre, setNewNombre] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editColor, setEditColor] = useState("");

  const { data: centrales = [], isLoading } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { nombre: string; color: string }) => {
      const response = await apiRequest("POST", "/api/centrales", {
        nombre: data.nombre,
        color: data.color,
        orden: centrales.length,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/centrales"] });
      setNewNombre("");
      setNewColor(DEFAULT_COLORS[(centrales.length + 1) % DEFAULT_COLORS.length]);
      toast({
        title: "Central agregada",
        description: "La central se ha agregado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar la central.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { nombre: string; color: string } }) => {
      const response = await apiRequest("PUT", `/api/centrales/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/centrales"] });
      setEditingId(null);
      toast({
        title: "Central actualizada",
        description: "La central se ha actualizado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la central.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/centrales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/centrales"] });
      toast({
        title: "Central eliminada",
        description: "La central se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la central.",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (!newNombre.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un nombre para la central.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ nombre: capitalizeWords(newNombre), color: newColor });
  };

  const handleStartEdit = (central: Central) => {
    setEditingId(central.id);
    setEditNombre(central.nombre);
    setEditColor(central.color);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editNombre.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: { nombre: capitalizeWords(editNombre), color: editColor },
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNombre("");
    setEditColor("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label>Gestión de Centrales</Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la central"
          value={newNombre}
          onChange={(e) => setNewNombre(e.target.value)}
          className="flex-1"
          data-testid="input-new-central-nombre"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          onBlur={(e) => {
            if (e.target.value) {
              setNewNombre(capitalizeWords(e.target.value));
            }
          }}
        />
        <Input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-14 p-1 h-9"
          data-testid="input-new-central-color"
        />
        <Button
          onClick={handleAdd}
          disabled={createMutation.isPending || !newNombre.trim()}
          size="icon"
          data-testid="button-add-central"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {centrales.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay centrales configuradas. Agregue una usando el formulario de arriba.
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centrales.map((central) => (
                <TableRow key={central.id} data-testid={`row-central-${central.id}`}>
                  <TableCell>
                    {editingId === central.id ? (
                      <Input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-8 p-1"
                        data-testid="input-edit-central-color"
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: central.color }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === central.id ? (
                      <Input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="h-8"
                        data-testid="input-edit-central-nombre"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        onBlur={(e) => {
                          if (e.target.value) {
                            setEditNombre(capitalizeWords(e.target.value));
                          }
                        }}
                      />
                    ) : (
                      <span className="font-medium">{central.nombre}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {editingId === central.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            className="h-8 w-8"
                            data-testid="button-save-central-edit"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="h-8 w-8"
                            data-testid="button-cancel-central-edit"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(central)}
                            className="h-8 w-8"
                            data-testid={`button-edit-central-${central.id}`}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(central.id)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8"
                            data-testid={`button-delete-central-${central.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
