import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface MyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBanco?: string;
  username?: string;
  onImportComplete: (result: { imported: number; duplicates: number }) => void;
}

export function MyImportDialog({ open, onOpenChange }: MyImportDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-cyan-600" />
            Importar Extracto Bancario
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-8 text-center text-muted-foreground">
          Función de importación pendiente de implementar
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-import">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
