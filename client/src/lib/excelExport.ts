import * as XLSX from "xlsx";
import { userContext } from "./queryClient";

interface BancoRecord {
  fecha: string;
  monto: number | string;
  saldo: number | string;
  saldo_conciliado: number | string;
}

export async function exportBancosToExcel(banco: string): Promise<boolean> {
  try {
    userContext.setAction("Exportando Excel de banco");
    
    const response = await fetch(`/api/bancos/export?banco=${encodeURIComponent(banco)}`, {
      headers: userContext.getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Error al obtener datos del banco");
    }
    
    const result = await response.json();
    const data: BancoRecord[] = result.data || [];
    
    if (data.length === 0) {
      return false;
    }
    
    const excelData = data.map((row) => ({
      Fecha: row.fecha || "",
      Monto: typeof row.monto === "number" ? row.monto : parseFloat(String(row.monto)) || 0,
      Saldo: typeof row.saldo === "number" ? row.saldo : parseFloat(String(row.saldo)) || 0,
      "Saldo Conciliado": typeof row.saldo_conciliado === "number" ? row.saldo_conciliado : parseFloat(String(row.saldo_conciliado)) || 0,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const colWidths = [
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
    ];
    worksheet["!cols"] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, banco.substring(0, 31));
    
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, "0")}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getFullYear().toString().slice(-2)}`;
    const filename = `Banco_${banco}_${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    return true;
  } catch (error) {
    console.error("Error exportando Excel:", error);
    return false;
  }
}
