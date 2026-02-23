import { useRef } from "react";
import { Printer } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";

export interface PieChartItem {
  label: string;
  value: number;
}

export interface HtmlReportData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  footers?: string[][];
  alignRight?: number[];
  pieChart?: PieChartItem[];
  groupedSections?: {
    title: string;
    headers: string[];
    rows: string[][];
    footers?: string[][];
    alignRight?: number[];
    pieChart?: PieChartItem[];
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

const PIE_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#a855f7", "#10b981",
  "#d946ef", "#facc15", "#64748b", "#fb923c", "#2dd4bf",
];

function PieChart({ items }: { items: PieChartItem[] }) {
  const total = items.reduce((sum, item) => sum + Math.abs(item.value), 0);
  if (total === 0) return null;

  const filtered = items.filter(i => Math.abs(i.value) > 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 90;
  let cumAngle = -Math.PI / 2;

  const slices = filtered.map((item, idx) => {
    const pct = Math.abs(item.value) / total;
    const angle = pct * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const color = PIE_COLORS[idx % PIE_COLORS.length];
    const d = filtered.length === 1
      ? `M ${cx},${cy - radius} A ${radius},${radius} 0 1,1 ${cx - 0.01},${cy - radius} Z`
      : `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
    return { d, color, label: item.label, pct };
  });

  return (
    <div className="flex flex-col items-center my-3 pie-chart-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pie-chart-svg">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 max-w-md pie-legend">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px]">
            <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 color-box" style={{ backgroundColor: s.color }} />
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px] pie-label">{s.label}</span>
            <span className="text-slate-500 dark:text-slate-400 font-bold pie-pct">{(s.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
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
          .grand-total td { font-size: 10px; font-weight: bold; border: 2px solid #000; padding: 4px 6px; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .section-title { font-size: 11px; font-weight: bold; margin: 8px 0 4px 0; }
          .pie-chart-container { display: flex; flex-direction: column; align-items: center; margin: 12px 0; page-break-inside: avoid; }
          .pie-chart-svg { display: block; }
          .pie-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 12px; margin-top: 8px; max-width: 400px; }
          .pie-legend > div { display: flex; align-items: center; gap: 3px; font-size: 9px; }
          .pie-legend .color-box { display: inline-block; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
          .pie-legend .pie-label { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .pie-legend .pie-pct { font-weight: bold; }
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
          <>
            {data.groupedSections.map((section, idx) => (
              <div key={idx} className="mb-4">
                <div className="section-title text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">{section.title}</div>
                <ReportTable
                  headers={section.headers}
                  rows={section.rows}
                  footers={section.footers}
                  alignRight={section.alignRight}
                />
                {section.pieChart && section.pieChart.length > 0 && (
                  <PieChart items={section.pieChart} />
                )}
              </div>
            ))}
            {data.footers && data.footers.length > 0 && (
              <table className="w-full text-xs border-collapse mt-2 grand-total">
                <tfoot>
                  {data.footers.map((row, fi) => (
                    <tr key={fi} className="bg-slate-200 dark:bg-slate-700 font-bold border-2 border-slate-500">
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`px-2 py-1.5 border border-slate-400 dark:border-slate-500 text-sm ${data.alignRight?.includes(ci) ? "text-right tabular-nums" : "text-left"}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tfoot>
              </table>
            )}
          </>
        ) : (
          <ReportTable
            headers={data.headers}
            rows={data.rows}
            footers={data.footers}
            alignRight={data.alignRight}
          />
        )}

        {data.pieChart && data.pieChart.length > 0 && (
          <PieChart items={data.pieChart} />
        )}
      </div>
    </div>
  );
}
