import { Button } from "@/components/ui/button";
import { Edit2, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ActionButtonProps {
  row: Record<string, any>;
  tableName?: string;
  disabled?: boolean;
  idx?: number | string;
}

interface MyEditarProps extends ActionButtonProps {
  onEdit: (row: Record<string, any>) => void;
}

interface MyCopiarProps extends ActionButtonProps {
  onCopy: (row: Record<string, any>) => void;
}

interface MyBorrarProps extends ActionButtonProps {
  onDelete: () => void;
}

export function MyEditar({ row, tableName, disabled, idx, onEdit }: MyEditarProps) {
  const isDisabled = disabled || !tableName;
  
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        onEdit(row);
      }}
      disabled={isDisabled}
      title="Editar"
      data-testid={`action-edit-${idx}`}
    >
      <Edit2 className={`h-3.5 w-3.5 ${!isDisabled ? "text-blue-600" : "text-muted-foreground/40"}`} />
    </Button>
  );
}

export function MyCopiar({ row, tableName, disabled, idx, onCopy }: MyCopiarProps) {
  const isDisabled = disabled || !tableName;
  
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        onCopy(row);
      }}
      disabled={isDisabled}
      title="Copiar"
      data-testid={`action-copy-${idx}`}
    >
      <Copy className={`h-3.5 w-3.5 ${!isDisabled ? "text-green-600" : "text-muted-foreground/40"}`} />
    </Button>
  );
}

export function MyBorrar({ row, tableName, disabled, idx, onDelete }: MyBorrarProps) {
  const { toast } = useToast();
  const isDisabled = disabled || !tableName || !row.id;
  
  const handleDelete = () => {
    if (!tableName || !row.id) return;
    
    toast({
      title: "¿Está seguro?",
      description: "Esta acción eliminará el registro permanentemente.",
      action: (
        <Button
          variant="destructive"
          size="sm"
          autoFocus
          onClick={() => {
            // Solo llamar onDelete - el padre maneja la mutación, toast y refresh
            onDelete();
          }}
          data-testid="confirm-delete"
        >
          Confirmar
        </Button>
      ),
    });
  };
  
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        handleDelete();
      }}
      disabled={isDisabled}
      title="Borrar"
      data-testid={`action-delete-${idx}`}
    >
      <Trash2 className={`h-3.5 w-3.5 ${!isDisabled ? "text-red-600" : "text-muted-foreground/40"}`} />
    </Button>
  );
}
