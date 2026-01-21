import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Column {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "center" | "right";
}

interface MyGridProps {
  columns: Column[];
  data: Record<string, any>[];
  onRowClick?: (row: Record<string, any>) => void;
  selectedRowId?: string | null;
}

export default function MyGrid({ columns, data, onRowClick, selectedRowId }: MyGridProps) {
  return (
    <ScrollArea className="h-full w-full">
      <Table style={{ tableLayout: "fixed" }}>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                style={{ width: col.width || 150 }}
                className={`text-sm font-medium ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow
              key={row.id || idx}
              className={`cursor-pointer hover:bg-muted/30 ${selectedRowId === row.id ? "bg-muted" : ""}`}
              onClick={() => onRowClick?.(row)}
              data-testid={`row-${idx}`}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  style={{ width: col.width || 150 }}
                  className={`text-sm py-1 truncate ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                >
                  {row[col.key] ?? "-"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
