import { useRef } from "react";
import { Printer } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";

export interface HtmlReportData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  footers?: string[][];
  alignRight?: number[];
  groupedSections?: {
    title: string;
    headers: string[];
    rows: string[][];
    footers?: string[][];
    alignRight?: number[];
  }[];
}

interface Props {
  data: HtmlReportData;
  config: {
    fechaInicial: string;
    fechaFinal: string;
    unidad?: string;
    banco?: string;
  };
}

const fmt = (val: string) => val;

function ReportTable({
  headers,
  rows,
  footers,
  alignRight = [],
}: {
  headers: string[];
  rows: string[][];
  footers?: string[][];
  alignRight?: number[];
}) {
  return (
    <table className="w-full text-xs border-collapse print-table">
      <thead>
        <tr className="bg-slate-600 dark:bg-slate-700">
          {headers.map((h, i) => (
            <th
              key={i}
              className={`px-2 py-1 text-white font-bold border border-slate-500 ${alignRight.includes(i) ? "text-right" : "text-left"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                className={`px-2 py-0.5 border border-slate-200 dark:border-slate-700 ${alignRight.includes(ci) ? "text-right tabular-nums" : "text-left"}`}
              >
                {fmt(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footers && footers.length > 0 && (
        <tfoot>
          {footers.map((row, fi) => (
            <tr key={fi} className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-400 dark:border-slate-500">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-2 py-1 border border-slate-300 dark:border-slate-600 ${alignRight.includes(ci) ? "text-right tabular-nums" : "text-left"}`}
                >
                  {fmt(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tfoot>
      )}
    </table>
  );
}

export default function ReporteHTMLViewer({ data, config }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10px; margin: 10px; color: #000; }
          h2 { font-size: 14px; text-align: center; margin: 0 0 4px 0; }
          .subtitle { font-size: 10px; text-align: center; margin-bottom: 8px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th { background: #fff; color: #000; font-weight: bold; border: 1px solid #000; padding: 3px 6px; font-size: 9px; }
          td { border: 1px solid #999; padding: 2px 6px; font-size: 9px; }
          tfoot td { font-weight: bold; border: 1px solid #000; background: #fff; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .section-title { font-size: 11px; font-weight: bold; margin: 8px 0 4px 0; }
          @media print { body { margin: 5mm; } }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const subtitleParts: string[] = [];
  subtitleParts.push(`Período: ${config.fechaInicial} al ${config.fechaFinal}`);
  if (config.unidad && config.unidad !== "all") subtitleParts.push(`Unidad: ${config.unidad}`);
  if (config.banco && config.banco !== "all") subtitleParts.push(`Banco: ${config.banco}`);
  const subtitleText = subtitleParts.join(" | ");

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="reporte-html-viewer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1">{data.title}</div>
        <MyButtonStyle color="blue" onClick={handlePrint} data-testid="button-imprimir-html">
          <Printer className="h-3.5 w-3.5 mr-1" />
          Imprimir
        </MyButtonStyle>
      </div>

      <div className="flex-1 overflow-auto p-3" ref={printRef}>
        <h2 className="text-sm font-bold text-center mb-1 text-slate-800 dark:text-slate-200">{data.title}</h2>
        <div className="subtitle text-[10px] text-center mb-3 text-slate-500 dark:text-slate-400">{data.subtitle || subtitleText}</div>

        {data.groupedSections ? (
          data.groupedSections.map((section, idx) => (
            <div key={idx} className="mb-3">
              <div className="section-title text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">{section.title}</div>
              <ReportTable
                headers={section.headers}
                rows={section.rows}
                footers={section.footers}
                alignRight={section.alignRight}
              />
            </div>
          ))
        ) : (
          <ReportTable
            headers={data.headers}
            rows={data.rows}
            footers={data.footers}
            alignRight={data.alignRight}
          />
        )}
      </div>
    </div>
  );
}
