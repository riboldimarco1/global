import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useMyPop } from "@/components/MyPop";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface NominaSemanalFincaProps {
  filtroDeUnidad: string;
}

interface NominaRow {
  nombre: string;
  cargo: string;
  sueldoDia: number;
  lun_asist: boolean;
  lun_he: number;
  mar_asist: boolean;
  mar_he: number;
  mie_asist: boolean;
  mie_he: number;
  jue_asist: boolean;
  jue_he: number;
  vie_asist: boolean;
  vie_he: number;
  sab_he: number;
  dom_he: number;
}

const TOTAL_ROWS = 50;

function createEmptyRow(): NominaRow {
  return {
    nombre: "",
    cargo: "",
    sueldoDia: 0,
    lun_asist: false,
    lun_he: 0,
    mar_asist: false,
    mar_he: 0,
    mie_asist: false,
    mie_he: 0,
    jue_asist: false,
    jue_he: 0,
    vie_asist: false,
    vie_he: 0,
    sab_he: 0,
    dom_he: 0,
  };
}

function formatDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

function calcRow(row: NominaRow, multiplicador: number) {
  const sueldoPorHora = row.sueldoDia / 8;
  let totalSalario = 0;
  let totalHE = 0;

  const days: Array<{ asist: boolean; he: number }> = [
    { asist: row.lun_asist, he: row.lun_he },
    { asist: row.mar_asist, he: row.mar_he },
    { asist: row.mie_asist, he: row.mie_he },
    { asist: row.jue_asist, he: row.jue_he },
    { asist: row.vie_asist, he: row.vie_he },
  ];

  for (const day of days) {
    if (day.asist) totalSalario += row.sueldoDia;
    if (day.he > 0) totalHE += day.he * sueldoPorHora * multiplicador;
  }

  if (row.sab_he > 0) totalHE += row.sab_he * sueldoPorHora * multiplicador;
  if (row.dom_he > 0) totalHE += row.dom_he * sueldoPorHora * multiplicador;

  return {
    total_salario: totalSalario,
    total_salario_he: totalSalario + totalHE,
  };
}

export default function NominaSemanalFinca({ filtroDeUnidad }: NominaSemanalFincaProps) {
  const { showPop } = useMyPop();
  const [rows, setRows] = useState<NominaRow[]>(() =>
    Array.from({ length: TOTAL_ROWS }, () => createEmptyRow())
  );

  const { data: personalData } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: ["/api/parametros", { tipo: "personal", unidad: filtroDeUnidad }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=personal&unidad=${encodeURIComponent(filtroDeUnidad)}`);
      return res.json();
    },
    enabled: !!filtroDeUnidad && filtroDeUnidad !== "all",
  });

  const { data: cargosData } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: ["/api/parametros", { tipo: "cargos finca" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=cargos%20finca`);
      return res.json();
    },
  });

  const { data: constantesData } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: ["/api/parametros", { tipo: "constantes" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=constantes`);
      return res.json();
    },
  });

  const cargosMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (cargosData?.data) {
      for (const c of cargosData.data) {
        const nombre = (c.nombre || "").toString().toLowerCase().trim();
        map[nombre] = parseFloat(c.valor) || 0;
      }
    }
    return map;
  }, [cargosData]);

  const multiplicador = useMemo(() => {
    if (constantesData?.data) {
      const rec = constantesData.data.find(
        (r: Record<string, any>) =>
          (r.nombre || "").toString().toLowerCase().trim() === "multiplicador horas extra"
      );
      if (rec) {
        const val = parseFloat(rec.valor) || parseFloat(rec.descripcion) || 0;
        return val > 0 ? val : 1.5;
      }
    }
    return 1.5;
  }, [constantesData]);

  useEffect(() => {
    if (!personalData?.data) return;
    const personal = personalData.data;
    setRows((prev) => {
      const newRows = prev.map((r) => ({ ...r }));
      for (let i = 0; i < Math.min(personal.length, TOTAL_ROWS); i++) {
        const p = personal[i];
        const nombre = (p.nombre || "").toString().toLowerCase().trim();
        const cargo = (p.categoria || "").toString().toLowerCase().trim();
        const sueldoDia = cargosMap[cargo] || 0;
        newRows[i] = {
          ...createEmptyRow(),
          nombre,
          cargo,
          sueldoDia,
        };
      }
      for (let i = personal.length; i < TOTAL_ROWS; i++) {
        newRows[i] = createEmptyRow();
      }
      return newRows;
    });
  }, [personalData, cargosMap]);

  const handleCheckbox = (idx: number, field: keyof NominaRow) => {
    setRows((prev) => {
      const newRows = [...prev];
      newRows[idx] = { ...newRows[idx], [field]: !newRows[idx][field] };
      return newRows;
    });
  };

  const handleNumber = (idx: number, field: keyof NominaRow, value: string) => {
    const num = value === "" ? 0 : parseFloat(value) || 0;
    setRows((prev) => {
      const newRows = [...prev];
      newRows[idx] = { ...newRows[idx], [field]: num };
      return newRows;
    });
  };

  const handlePrintNomina = () => {
    const filledRows = rows.filter((r) => r.nombre.trim() !== "");
    if (filledRows.length === 0) {
      showPop({ title: "aviso", message: "no hay registros para imprimir" });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(12);
    doc.text("nómina semanal finca", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(9);
    doc.text(`unidad: ${filtroDeUnidad}`, 14, 17);
    doc.text(`fecha: ${formatDate()}`, pageWidth - 14, 17, { align: "right" });

    const head = [
      ["#", "nombre", "cargo", "lun", "h.e", "mar", "h.e", "mié", "h.e", "jue", "h.e", "vie", "h.e", "sáb h.e", "dom h.e", "salario", "sal+h.e"],
    ];

    let grandTotalSalario = 0;
    let grandTotalHE = 0;

    const body = filledRows.map((row, i) => {
      const calc = calcRow(row, multiplicador);
      grandTotalSalario += calc.total_salario;
      grandTotalHE += calc.total_salario_he;
      return [
        String(i + 1),
        row.nombre,
        row.cargo,
        row.lun_asist ? "x" : "",
        row.lun_he > 0 ? String(row.lun_he) : "",
        row.mar_asist ? "x" : "",
        row.mar_he > 0 ? String(row.mar_he) : "",
        row.mie_asist ? "x" : "",
        row.mie_he > 0 ? String(row.mie_he) : "",
        row.jue_asist ? "x" : "",
        row.jue_he > 0 ? String(row.jue_he) : "",
        row.vie_asist ? "x" : "",
        row.vie_he > 0 ? String(row.vie_he) : "",
        row.sab_he > 0 ? String(row.sab_he) : "",
        row.dom_he > 0 ? String(row.dom_he) : "",
        calc.total_salario > 0 ? calc.total_salario.toFixed(2) : "",
        calc.total_salario_he > 0 ? calc.total_salario_he.toFixed(2) : "",
      ];
    });

    body.push([
      "", "", "totales", "", "", "", "", "", "", "", "", "", "", "", "",
      grandTotalSalario > 0 ? grandTotalSalario.toFixed(2) : "",
      grandTotalHE > 0 ? grandTotalHE.toFixed(2) : "",
    ]);

    autoTable(doc, {
      startY: 21,
      head,
      body,
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 1, halign: "center" },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold", fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 38, halign: "left" },
        2: { cellWidth: 25, halign: "left" },
        3: { cellWidth: 10 },
        4: { cellWidth: 10 },
        5: { cellWidth: 10 },
        6: { cellWidth: 10 },
        7: { cellWidth: 10 },
        8: { cellWidth: 10 },
        9: { cellWidth: 10 },
        10: { cellWidth: 10 },
        11: { cellWidth: 10 },
        12: { cellWidth: 10 },
        13: { cellWidth: 13 },
        14: { cellWidth: 13 },
        15: { cellWidth: 20, halign: "right" },
        16: { cellWidth: 22, halign: "right" },
      },
      didParseCell: (data: any) => {
        if (data.row.index === body.length - 1 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [230, 230, 230];
        }
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`nomina_semanal_finca_${filtroDeUnidad}_${formatDate().replace(/\//g, "-")}.pdf`);
    showPop({ title: "listo", message: "nómina generada exitosamente" });
  };

  return (
    <div className="flex flex-col h-full" data-testid="nomina-semanal-finca">
      <div className="flex items-center gap-3 flex-wrap p-2 border-b">
        <span className="text-xs font-medium" data-testid="text-unidad">
          unidad: <strong>{filtroDeUnidad}</strong>
        </span>
        <span className="text-xs font-medium" data-testid="text-fecha">
          fecha: <strong>{formatDate()}</strong>
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <MyButtonStyle
            color="blue"
            onClick={handlePrintNomina}
            data-testid="button-imprimir-nomina"
          >
            imprimir nómina
          </MyButtonStyle>
          <MyButtonStyle
            color="green"
            onClick={() => console.log("transferencias")}
            data-testid="button-enviar-transferencias"
          >
            enviar a transferencias
          </MyButtonStyle>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table
          className="w-full text-xs"
          style={{ borderCollapse: "collapse" }}
          data-testid="nomina-table"
        >
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="border border-border px-1 py-1 text-left" style={{ width: 160, minWidth: 160 }}>nombre</th>
              <th className="border border-border px-1 py-1 text-left" style={{ width: 120, minWidth: 120 }}>cargo</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 70, minWidth: 70 }}>lunes asist</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 60, minWidth: 60 }}>lunes h.e</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 70, minWidth: 70 }}>martes asist</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 60, minWidth: 60 }}>martes h.e</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 70, minWidth: 70 }}>miércoles asist</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 60, minWidth: 60 }}>miércoles h.e</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 70, minWidth: 70 }}>jueves asist</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 60, minWidth: 60 }}>jueves h.e</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 70, minWidth: 70 }}>viernes asist</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 60, minWidth: 60 }}>viernes h.e</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 70, minWidth: 70 }}>sábado h.e</th>
              <th className="border border-border px-1 py-1 text-center" style={{ width: 70, minWidth: 70 }}>domingo h.e</th>
              <th className="border border-border px-1 py-1 text-right" style={{ width: 100, minWidth: 100 }}>total salario</th>
              <th className="border border-border px-1 py-1 text-right" style={{ width: 110, minWidth: 110 }}>total salario + h.e</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const calc = calcRow(row, multiplicador);
              return (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  data-testid={`row-nomina-${idx}`}
                >
                  <td className="border border-border px-1 py-0.5" style={{ width: 160 }}>
                    <span data-testid={`text-nombre-${idx}`}>{row.nombre}</span>
                  </td>
                  <td className="border border-border px-1 py-0.5" style={{ width: 120 }}>
                    <span data-testid={`text-cargo-${idx}`}>{row.cargo}</span>
                  </td>
                  {/* lunes */}
                  <td className="border border-border text-center" style={{ width: 70 }}>
                    <input
                      type="checkbox"
                      checked={row.lun_asist}
                      onChange={() => handleCheckbox(idx, "lun_asist")}
                      data-testid={`checkbox-lun-asist-${idx}`}
                    />
                  </td>
                  <td className="border border-border p-0" style={{ width: 60 }}>
                    <input
                      type="number"
                      value={row.lun_he || ""}
                      onChange={(e) => handleNumber(idx, "lun_he", e.target.value)}
                      className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`input-lun-he-${idx}`}
                    />
                  </td>
                  {/* martes */}
                  <td className="border border-border text-center" style={{ width: 70 }}>
                    <input
                      type="checkbox"
                      checked={row.mar_asist}
                      onChange={() => handleCheckbox(idx, "mar_asist")}
                      data-testid={`checkbox-mar-asist-${idx}`}
                    />
                  </td>
                  <td className="border border-border p-0" style={{ width: 60 }}>
                    <input
                      type="number"
                      value={row.mar_he || ""}
                      onChange={(e) => handleNumber(idx, "mar_he", e.target.value)}
                      className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`input-mar-he-${idx}`}
                    />
                  </td>
                  {/* miércoles */}
                  <td className="border border-border text-center" style={{ width: 70 }}>
                    <input
                      type="checkbox"
                      checked={row.mie_asist}
                      onChange={() => handleCheckbox(idx, "mie_asist")}
                      data-testid={`checkbox-mie-asist-${idx}`}
                    />
                  </td>
                  <td className="border border-border p-0" style={{ width: 60 }}>
                    <input
                      type="number"
                      value={row.mie_he || ""}
                      onChange={(e) => handleNumber(idx, "mie_he", e.target.value)}
                      className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`input-mie-he-${idx}`}
                    />
                  </td>
                  {/* jueves */}
                  <td className="border border-border text-center" style={{ width: 70 }}>
                    <input
                      type="checkbox"
                      checked={row.jue_asist}
                      onChange={() => handleCheckbox(idx, "jue_asist")}
                      data-testid={`checkbox-jue-asist-${idx}`}
                    />
                  </td>
                  <td className="border border-border p-0" style={{ width: 60 }}>
                    <input
                      type="number"
                      value={row.jue_he || ""}
                      onChange={(e) => handleNumber(idx, "jue_he", e.target.value)}
                      className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`input-jue-he-${idx}`}
                    />
                  </td>
                  {/* viernes */}
                  <td className="border border-border text-center" style={{ width: 70 }}>
                    <input
                      type="checkbox"
                      checked={row.vie_asist}
                      onChange={() => handleCheckbox(idx, "vie_asist")}
                      data-testid={`checkbox-vie-asist-${idx}`}
                    />
                  </td>
                  <td className="border border-border p-0" style={{ width: 60 }}>
                    <input
                      type="number"
                      value={row.vie_he || ""}
                      onChange={(e) => handleNumber(idx, "vie_he", e.target.value)}
                      className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`input-vie-he-${idx}`}
                    />
                  </td>
                  {/* sábado */}
                  <td className="border border-border p-0" style={{ width: 70 }}>
                    <input
                      type="number"
                      value={row.sab_he || ""}
                      onChange={(e) => handleNumber(idx, "sab_he", e.target.value)}
                      className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`input-sab-he-${idx}`}
                    />
                  </td>
                  {/* domingo */}
                  <td className="border border-border p-0" style={{ width: 70 }}>
                    <input
                      type="number"
                      value={row.dom_he || ""}
                      onChange={(e) => handleNumber(idx, "dom_he", e.target.value)}
                      className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`input-dom-he-${idx}`}
                    />
                  </td>
                  {/* totales */}
                  <td
                    className="border border-border px-1 py-0.5 text-right font-bold"
                    style={{ width: 100 }}
                    data-testid={`text-total-salario-${idx}`}
                  >
                    {calc.total_salario > 0 ? calc.total_salario.toFixed(2) : ""}
                  </td>
                  <td
                    className="border border-border px-1 py-0.5 text-right font-bold"
                    style={{ width: 110 }}
                    data-testid={`text-total-salario-he-${idx}`}
                  >
                    {calc.total_salario_he > 0 ? calc.total_salario_he.toFixed(2) : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
