import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Column {
  key: string;
  label: string;
  width?: number;
}

interface TabConfig {
  id: string;
  label: string;
  columns: Column[];
  data: Record<string, any>[];
}

interface MyTabProps {
  tabs: TabConfig[];
  defaultTab?: string;
  onRowClick?: (row: Record<string, any>, tabId: string) => void;
}

export default function MyTab({ tabs, defaultTab, onRowClick }: MyTabProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="text-sm"
            data-testid={`tab-trigger-${tab.id}`}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="flex-1 mt-2 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
              <TableHeader>
                <TableRow className="compact-row bg-muted/50">
                  {tab.columns.map((col) => (
                    <TableHead
                      key={col.key}
                      style={{ width: col.width || 150 }}
                      className="text-sm font-medium"
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tab.data.map((row, idx) => (
                  <TableRow
                    key={row.id || idx}
                    className="compact-row cursor-pointer hover:bg-muted/30"
                    onClick={() => onRowClick?.(row, tab.id)}
                    data-testid={`row-${tab.id}-${idx}`}
                  >
                    {tab.columns.map((col) => (
                      <TableCell
                        key={col.key}
                        style={{ width: col.width || 150 }}
                        className="text-sm py-1 truncate"
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
        </TabsContent>
      ))}
    </Tabs>
  );
}
