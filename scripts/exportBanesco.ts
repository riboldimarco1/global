import { db } from "../server/db";
import { bancos } from "../shared/schema";
import { eq, and, asc } from "drizzle-orm";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

async function exportBanesco() {
  console.log("Consultando datos de banesco con conciliado=true...");
  
  const data = await db
    .select({
      fecha: bancos.fecha,
      descripcion: bancos.descripcion,
      operador: bancos.operador,
      monto: bancos.monto,
      saldo: bancos.saldo,
      saldo_conciliado: bancos.saldo_conciliado,
    })
    .from(bancos)
    .where(and(eq(bancos.banco, "banesco"), eq(bancos.conciliado, true)))
    .orderBy(asc(bancos.fecha), asc(bancos.created_at), asc(bancos.id));

  console.log(`Encontrados ${data.length} registros`);

  const rows = data.map((row) => ({
    Fecha: row.fecha,
    Descripcion: row.descripcion || "",
    Operador: row.operador || "",
    Monto: Number(row.monto) || 0,
    Saldo: Number(row.saldo) || 0,
    Saldo_Conciliado: Number(row.saldo_conciliado) || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Banesco");

  const outputPath = path.join(process.cwd(), "client", "public", "banesco_conciliado.xlsx");
  XLSX.writeFile(wb, outputPath);
  
  console.log(`Archivo Excel generado: ${outputPath}`);
  console.log("Puedes descargarlo desde: /banesco_conciliado.xlsx");
  
  process.exit(0);
}

exportBanesco().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
