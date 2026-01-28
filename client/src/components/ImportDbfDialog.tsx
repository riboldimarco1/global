import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileArchive } from "lucide-react";

interface ImportDbfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDbfDialog({ open, onOpenChange }: ImportDbfDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Importar datos de DBF
          </DialogTitle>
          <DialogDescription>
            Esta función está deshabilitada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-import">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
