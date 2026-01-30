import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ReportesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateReport?: (category: string, option: string) => void;
}

const REPORT_CATEGORIES = {
  left: [
    {
      title: "Gastos y Facturas",
      key: "gastos_facturas",
      options: [
        { value: "completo", label: "Completo" },
        { value: "resumido_actividad", label: "Resumido por actividad" },
        { value: "resumido_proveedor", label: "Resumido por proveedor" },
        { value: "resumido_insumo", label: "Resumido por insumo" },
      ],
    },
    {
      title: "Nomina",
      key: "nomina",
      options: [
        { value: "completo", label: "Completo" },
        { value: "resumido_personal", label: "Resumido por personal" },
        { value: "resumido_actividad", label: "Resumido por actividad" },
      ],
    },
    {
      title: "Ventas",
      key: "ventas",
      options: [
        { value: "completo", label: "Completo" },
        { value: "resumido_producto", label: "Resumido por producto" },
      ],
    },
    {
      title: "Cuentas por pagar",
      key: "cuentas_pagar",
      options: [
        { value: "completo", label: "Completo" },
        { value: "ordenado_actividad", label: "Ordenado por actividad" },
        { value: "resumido_actividad", label: "Resumido por actividad" },
        { value: "ordenado_proveedor", label: "Ordenado por proveedor" },
        { value: "resumido_proveedor", label: "Resumido por proveedor" },
      ],
    },
  ],
  right: [
    {
      title: "Cuentas por cobrar",
      key: "cuentas_cobrar",
      options: [
        { value: "completo", label: "Completo" },
        { value: "ordenado_producto", label: "Ordenado por producto" },
        { value: "resumido_producto", label: "Resumido por producto" },
      ],
    },
    {
      title: "Prestamos",
      key: "prestamos",
      options: [
        { value: "completo", label: "Completo" },
        { value: "ordenado_personal", label: "Ordenado por personal" },
        { value: "resumido_personal", label: "Resumido por personal" },
      ],
    },
    {
      title: "Administracion",
      key: "administracion",
      options: [
        { value: "ingresos_egresos_unidad", label: "Ingresos/Egresos por mes de esta unidad" },
        { value: "ingresos_egresos_todas", label: "Ingresos/Egresos por mes de todas las unidades" },
      ],
    },
  ],
};

export default function ReportesModal({ open, onOpenChange, onGenerateReport }: ReportesModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const handleOptionChange = (categoryKey: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [categoryKey]: value }));
  };

  const handleGenerate = () => {
    const selected = Object.entries(selectedOptions).find(([_, value]) => value);
    if (selected && onGenerateReport) {
      onGenerateReport(selected[0], selected[1]);
    }
    onOpenChange(false);
  };

  const renderCategory = (category: { title: string; key: string; options: { value: string; label: string }[] }) => (
    <div key={category.key} className="mb-4">
      <h3 className="text-orange-500 font-semibold text-sm mb-2">{category.title}</h3>
      <RadioGroup
        value={selectedOptions[category.key] || ""}
        onValueChange={(value) => handleOptionChange(category.key, value)}
        className="space-y-1"
      >
        {category.options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`${category.key}-${option.value}`}
              className="border-gray-400 text-orange-500"
            />
            <Label
              htmlFor={`${category.key}-${option.value}`}
              className="text-xs text-gray-300 cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-orange-500">Reportes</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-2">
            {REPORT_CATEGORIES.left.map(renderCategory)}
          </div>
          <div className="space-y-2">
            {REPORT_CATEGORIES.right.map(renderCategory)}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancelar-reportes">
            Cancelar
          </Button>
          <Button onClick={handleGenerate} className="bg-orange-600 hover:bg-orange-700" data-testid="button-generar-reporte">
            Generar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
