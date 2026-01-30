import { useState } from "react";
import { MyWindow } from "@/components/My";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, ShoppingCart, CreditCard, Receipt, PiggyBank } from "lucide-react";
import { generateGastosCompleto, generateNominaCompleto, generateVentasCompleto } from "@/lib/pdfReports";
import { useTableData } from "@/contexts/TableDataContext";

interface AdminReportsWindowProps {
  onClose: () => void;
  zIndex?: number;
}

export function AdminReportsWindow({ onClose, zIndex }: AdminReportsWindowProps) {
  const { tableData } = useTableData();

  const handleGenerateReport = (type: string) => {
    // In a real scenario, we'd filter tableData by type if needed
    // or fetch specific data. For now, we use current tableData.
    const config = {
      title: type.toUpperCase(),
      fechaInicial: "2025-01-01",
      fechaFinal: "2025-12-31",
    };

    let result;
    if (type === "gastos") result = generateGastosCompleto(tableData as any, config);
    else if (type === "nomina") result = generateNominaCompleto(tableData as any, config);
    else if (type === "ventas") result = generateVentasCompleto(tableData as any, config);
    
    if (result) {
      const url = URL.createObjectURL(result.blob);
      window.open(url);
    }
  };

  const reportTypes = [
    { id: "gastos", label: "Gastos y Facturas", icon: Receipt, color: "text-red-600" },
    { id: "nomina", label: "Nómina", icon: Users, color: "text-blue-600" },
    { id: "ventas", label: "Ventas", icon: ShoppingCart, color: "text-green-600" },
    { id: "cuentasporpagar", label: "Cuentas por Pagar", icon: CreditCard, color: "text-orange-600" },
    { id: "cuentasporcobrar", label: "Cuentas por Cobrar", icon: FileText, color: "text-cyan-600" },
    { id: "prestamos", label: "Préstamos", icon: PiggyBank, color: "text-purple-600" },
  ];

  return (
    <MyWindow
      id="admin-reports"
      title="Reportes de Administración"
      initialPosition={{ x: 200, y: 150 }}
      initialSize={{ width: 500, height: 400 }}
      onClose={onClose}
      zIndex={zIndex}
      borderColor="border-purple-500/40"
    >
      <div className="p-4 grid grid-cols-2 gap-4">
        {reportTypes.map((report) => (
          <Card 
            key={report.id} 
            className="hover:bg-slate-50 cursor-pointer transition-colors border-slate-200"
            onClick={() => handleGenerateReport(report.id)}
          >
            <CardHeader className="p-4 flex flex-row items-center gap-3 space-y-0">
              <report.icon className={`h-5 w-5 ${report.color}`} />
              <CardTitle className="text-sm font-medium">{report.label}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </MyWindow>
  );
}
