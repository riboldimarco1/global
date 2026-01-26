import { Button } from "@/components/ui/button";
import { Edit2, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  onDelete: (row: Record<string, any>) => Promise<void> | void;
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
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled) return;
    
    toast({
      title: "¿Borrar registro?",
      description: `ID: ${row.id}`,
      action: (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(row)}
          data-testid={`confirm-delete-${idx}`}
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
      onClick={handleClick}
      disabled={isDisabled}
      title="Borrar"
      data-testid={`action-delete-${idx}`}
    >
      <Trash2 className={`h-3.5 w-3.5 ${!isDisabled ? "text-red-600" : "text-muted-foreground/40"}`} />
    </Button>
  );
}
