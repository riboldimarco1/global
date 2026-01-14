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
import type { Finca } from "@shared/schema";

function capitalizeText(text: string): string {
  if (!text) return text;
  const trimmed = text.trim().toLowerCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function FincasManager() {
  const { toast } = useToast();
  const [newNombre, setNewNombre] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  const { data: fincas = [], isLoading } = useQuery<Finca[]>({
    queryKey: ["/api/fincas"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { nombre: string }) => {
      const response = await apiRequest("POST", "/api/fincas", {
        nombre: capitalizeText(data.nombre),
        orden: fincas.length,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fincas"] });
      setNewNombre("");
      toast({
        title: "Finca agregada",
        description: "La finca se ha agregado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar la finca.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { nombre: string } }) => {
      const response = await apiRequest("PUT", `/api/fincas/${id}`, {
        nombre: capitalizeText(data.nombre),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fincas"] });
      setEditingId(null);
      toast({
        title: "Finca actualizada",
        description: "La finca se ha actualizado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la finca.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/fincas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fincas"] });
      toast({
        title: "Finca eliminada",
        description: "La finca se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la finca.",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (!newNombre.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un nombre para la finca.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ nombre: newNombre.trim() });
  };

  const handleStartEdit = (finca: Finca) => {
    setEditingId(finca.id);
    setEditNombre(finca.nombre);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editNombre.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: { nombre: editNombre.trim() },
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNombre("");
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
      <Label>Gestión de Fincas</Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la finca"
          value={newNombre}
          onChange={(e) => setNewNombre(e.target.value)}
          className="flex-1"
          data-testid="input-new-finca-nombre"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          onClick={handleAdd}
          disabled={createMutation.isPending || !newNombre.trim()}
          size="icon"
          data-testid="button-add-finca"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {fincas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay fincas configuradas. Agregue una usando el formulario de arriba.
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fincas.map((finca) => (
                <TableRow key={finca.id} data-testid={`row-finca-${finca.id}`}>
                  <TableCell>
                    {editingId === finca.id ? (
                      <Input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="h-8"
                        data-testid="input-edit-finca-nombre"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                    ) : (
                      <span className="font-medium">{finca.nombre}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {editingId === finca.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            className="h-8 w-8"
                            data-testid="button-save-finca-edit"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="h-8 w-8"
                            data-testid="button-cancel-finca-edit"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(finca)}
                            className="h-8 w-8"
                            data-testid={`button-edit-finca-${finca.id}`}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(finca.id)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8"
                            data-testid={`button-delete-finca-${finca.id}`}
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
