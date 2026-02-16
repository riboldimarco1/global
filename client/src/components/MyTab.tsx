import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import MyGrid, { type Column } from "./MyGrid";
import { useTableData } from "@/contexts/TableDataContext";
import { matchesTipo } from "@/hooks/useParametrosOptions";
import { useStyleMode } from "@/contexts/StyleModeContext";
import NominaSemanalFinca from "./NominaSemanalFinca";
import PagoSemanalProveedores from "./PagoSemanalProveedores";
import AdminParametros from "./AdminParametros";

export type TabColor = 
  | "purple" | "purple-light" 
  | "indigo" | "indigo-light" 
  | "blue" | "blue-light" 
  | "cyan" | "cyan-light" 
  | "teal" | "teal-light" 
  | "green" | "green-light" 
  | "emerald" | "emerald-light" 
  | "yellow" 
  | "amber" | "amber-light" 
  | "orange" | "orange-light" 
  | "red" | "red-light" 
  | "rose" | "rose-light" 
  | "pink" | "pink-light" 
  | "violet" 
  | "gray" | "slate" | "zinc";

export interface SubTabConfig {
  id: string;
  label: string;
  color?: TabColor;
  hasGrid?: boolean;
  component?: string;
}

export interface TabConfig {
  id: string;
  label: string;
  tipo: string;
  columns: Column[];
  color?: TabColor;
  subTabs?: SubTabConfig[];
}

export const tabAlegreClasses: Record<TabColor, { bg: string; border: string; text: string; activeBg: string; shadow: string }> = {
  purple: { bg: "bg-gradient-to-b from-purple-500 to-purple-700", border: "border-purple-800", text: "text-white", activeBg: "bg-gradient-to-b from-purple-600 to-purple-800", shadow: "shadow-[0_3px_0_0_rgb(88,28,135)]" },
  "purple-light": { bg: "bg-gradient-to-b from-purple-400 to-purple-600", border: "border-purple-700", text: "text-white", activeBg: "bg-gradient-to-b from-purple-500 to-purple-700", shadow: "shadow-[0_3px_0_0_rgb(107,33,168)]" },
  indigo: { bg: "bg-gradient-to-b from-indigo-500 to-indigo-700", border: "border-indigo-800", text: "text-white", activeBg: "bg-gradient-to-b from-indigo-600 to-indigo-800", shadow: "shadow-[0_3px_0_0_rgb(49,46,129)]" },
  "indigo-light": { bg: "bg-gradient-to-b from-indigo-400 to-indigo-600", border: "border-indigo-700", text: "text-white", activeBg: "bg-gradient-to-b from-indigo-500 to-indigo-700", shadow: "shadow-[0_3px_0_0_rgb(67,56,202)]" },
  blue: { bg: "bg-gradient-to-b from-blue-500 to-blue-700", border: "border-blue-800", text: "text-white", activeBg: "bg-gradient-to-b from-blue-600 to-blue-800", shadow: "shadow-[0_3px_0_0_rgb(30,58,138)]" },
  "blue-light": { bg: "bg-gradient-to-b from-blue-400 to-blue-600", border: "border-blue-700", text: "text-white", activeBg: "bg-gradient-to-b from-blue-500 to-blue-700", shadow: "shadow-[0_3px_0_0_rgb(29,78,216)]" },
  cyan: { bg: "bg-gradient-to-b from-cyan-500 to-cyan-700", border: "border-cyan-800", text: "text-white", activeBg: "bg-gradient-to-b from-cyan-600 to-cyan-800", shadow: "shadow-[0_3px_0_0_rgb(22,78,99)]" },
  "cyan-light": { bg: "bg-gradient-to-b from-cyan-400 to-cyan-600", border: "border-cyan-700", text: "text-white", activeBg: "bg-gradient-to-b from-cyan-500 to-cyan-700", shadow: "shadow-[0_3px_0_0_rgb(14,116,144)]" },
  teal: { bg: "bg-gradient-to-b from-teal-500 to-teal-700", border: "border-teal-800", text: "text-white", activeBg: "bg-gradient-to-b from-teal-600 to-teal-800", shadow: "shadow-[0_3px_0_0_rgb(19,78,74)]" },
  "teal-light": { bg: "bg-gradient-to-b from-teal-400 to-teal-600", border: "border-teal-700", text: "text-white", activeBg: "bg-gradient-to-b from-teal-500 to-teal-700", shadow: "shadow-[0_3px_0_0_rgb(15,118,110)]" },
  green: { bg: "bg-gradient-to-b from-green-500 to-green-700", border: "border-green-800", text: "text-white", activeBg: "bg-gradient-to-b from-green-600 to-green-800", shadow: "shadow-[0_3px_0_0_rgb(20,83,45)]" },
  "green-light": { bg: "bg-gradient-to-b from-green-400 to-green-600", border: "border-green-700", text: "text-white", activeBg: "bg-gradient-to-b from-green-500 to-green-700", shadow: "shadow-[0_3px_0_0_rgb(22,163,74)]" },
  emerald: { bg: "bg-gradient-to-b from-emerald-500 to-emerald-700", border: "border-emerald-800", text: "text-white", activeBg: "bg-gradient-to-b from-emerald-600 to-emerald-800", shadow: "shadow-[0_3px_0_0_rgb(6,78,59)]" },
  "emerald-light": { bg: "bg-gradient-to-b from-emerald-400 to-emerald-600", border: "border-emerald-700", text: "text-white", activeBg: "bg-gradient-to-b from-emerald-500 to-emerald-700", shadow: "shadow-[0_3px_0_0_rgb(5,150,105)]" },
  yellow: { bg: "bg-gradient-to-b from-yellow-400 to-yellow-600", border: "border-yellow-700", text: "text-black", activeBg: "bg-gradient-to-b from-yellow-500 to-yellow-700", shadow: "shadow-[0_3px_0_0_rgb(133,77,14)]" },
  amber: { bg: "bg-gradient-to-b from-amber-500 to-amber-700", border: "border-amber-800", text: "text-white", activeBg: "bg-gradient-to-b from-amber-600 to-amber-800", shadow: "shadow-[0_3px_0_0_rgb(120,53,15)]" },
  "amber-light": { bg: "bg-gradient-to-b from-amber-400 to-amber-600", border: "border-amber-700", text: "text-black", activeBg: "bg-gradient-to-b from-amber-500 to-amber-700", shadow: "shadow-[0_3px_0_0_rgb(180,83,9)]" },
  orange: { bg: "bg-gradient-to-b from-orange-500 to-orange-700", border: "border-orange-800", text: "text-white", activeBg: "bg-gradient-to-b from-orange-600 to-orange-800", shadow: "shadow-[0_3px_0_0_rgb(124,45,18)]" },
  "orange-light": { bg: "bg-gradient-to-b from-orange-400 to-orange-600", border: "border-orange-700", text: "text-white", activeBg: "bg-gradient-to-b from-orange-500 to-orange-700", shadow: "shadow-[0_3px_0_0_rgb(194,65,12)]" },
  red: { bg: "bg-gradient-to-b from-red-500 to-red-700", border: "border-red-800", text: "text-white", activeBg: "bg-gradient-to-b from-red-600 to-red-800", shadow: "shadow-[0_3px_0_0_rgb(127,29,29)]" },
  "red-light": { bg: "bg-gradient-to-b from-red-400 to-red-600", border: "border-red-700", text: "text-white", activeBg: "bg-gradient-to-b from-red-500 to-red-700", shadow: "shadow-[0_3px_0_0_rgb(185,28,28)]" },
  rose: { bg: "bg-gradient-to-b from-rose-500 to-rose-700", border: "border-rose-800", text: "text-white", activeBg: "bg-gradient-to-b from-rose-600 to-rose-800", shadow: "shadow-[0_3px_0_0_rgb(136,19,55)]" },
  "rose-light": { bg: "bg-gradient-to-b from-rose-400 to-rose-600", border: "border-rose-700", text: "text-white", activeBg: "bg-gradient-to-b from-rose-500 to-rose-700", shadow: "shadow-[0_3px_0_0_rgb(190,18,60)]" },
  pink: { bg: "bg-gradient-to-b from-pink-500 to-pink-700", border: "border-pink-800", text: "text-white", activeBg: "bg-gradient-to-b from-pink-600 to-pink-800", shadow: "shadow-[0_3px_0_0_rgb(131,24,67)]" },
  "pink-light": { bg: "bg-gradient-to-b from-pink-400 to-pink-600", border: "border-pink-700", text: "text-white", activeBg: "bg-gradient-to-b from-pink-500 to-pink-700", shadow: "shadow-[0_3px_0_0_rgb(190,24,93)]" },
  violet: { bg: "bg-gradient-to-b from-violet-500 to-violet-700", border: "border-violet-800", text: "text-white", activeBg: "bg-gradient-to-b from-violet-600 to-violet-800", shadow: "shadow-[0_3px_0_0_rgb(76,29,149)]" },
  gray: { bg: "bg-gradient-to-b from-gray-400 to-gray-600", border: "border-gray-700", text: "text-white", activeBg: "bg-gradient-to-b from-gray-500 to-gray-700", shadow: "shadow-[0_3px_0_0_rgb(55,65,81)]" },
  slate: { bg: "bg-gradient-to-b from-slate-500 to-slate-700", border: "border-slate-800", text: "text-white", activeBg: "bg-gradient-to-b from-slate-600 to-slate-800", shadow: "shadow-[0_3px_0_0_rgb(30,41,59)]" },
  zinc: { bg: "bg-gradient-to-b from-zinc-400 to-zinc-600", border: "border-zinc-700", text: "text-white", activeBg: "bg-gradient-to-b from-zinc-500 to-zinc-700", shadow: "shadow-[0_3px_0_0_rgb(63,63,70)]" },
};

export const tabMinimizadoClasses: Record<TabColor, { bg: string; border: string; text: string; activeBg: string; shadow: string }> = {
  purple: { bg: "bg-purple-600", border: "border-purple-700", text: "text-white", activeBg: "bg-purple-700", shadow: "shadow-sm" },
  "purple-light": { bg: "bg-purple-500", border: "border-purple-600", text: "text-white", activeBg: "bg-purple-600", shadow: "shadow-sm" },
  indigo: { bg: "bg-indigo-600", border: "border-indigo-700", text: "text-white", activeBg: "bg-indigo-700", shadow: "shadow-sm" },
  "indigo-light": { bg: "bg-indigo-500", border: "border-indigo-600", text: "text-white", activeBg: "bg-indigo-600", shadow: "shadow-sm" },
  blue: { bg: "bg-blue-600", border: "border-blue-700", text: "text-white", activeBg: "bg-blue-700", shadow: "shadow-sm" },
  "blue-light": { bg: "bg-blue-500", border: "border-blue-600", text: "text-white", activeBg: "bg-blue-600", shadow: "shadow-sm" },
  cyan: { bg: "bg-cyan-600", border: "border-cyan-700", text: "text-white", activeBg: "bg-cyan-700", shadow: "shadow-sm" },
  "cyan-light": { bg: "bg-cyan-500", border: "border-cyan-600", text: "text-white", activeBg: "bg-cyan-600", shadow: "shadow-sm" },
  teal: { bg: "bg-teal-600", border: "border-teal-700", text: "text-white", activeBg: "bg-teal-700", shadow: "shadow-sm" },
  "teal-light": { bg: "bg-teal-500", border: "border-teal-600", text: "text-white", activeBg: "bg-teal-600", shadow: "shadow-sm" },
  green: { bg: "bg-green-600", border: "border-green-700", text: "text-white", activeBg: "bg-green-700", shadow: "shadow-sm" },
  "green-light": { bg: "bg-green-500", border: "border-green-600", text: "text-white", activeBg: "bg-green-600", shadow: "shadow-sm" },
  emerald: { bg: "bg-emerald-600", border: "border-emerald-700", text: "text-white", activeBg: "bg-emerald-700", shadow: "shadow-sm" },
  "emerald-light": { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-white", activeBg: "bg-emerald-600", shadow: "shadow-sm" },
  yellow: { bg: "bg-yellow-500", border: "border-yellow-600", text: "text-black", activeBg: "bg-yellow-600", shadow: "shadow-sm" },
  amber: { bg: "bg-amber-600", border: "border-amber-700", text: "text-white", activeBg: "bg-amber-700", shadow: "shadow-sm" },
  "amber-light": { bg: "bg-amber-500", border: "border-amber-600", text: "text-black", activeBg: "bg-amber-600", shadow: "shadow-sm" },
  orange: { bg: "bg-orange-600", border: "border-orange-700", text: "text-white", activeBg: "bg-orange-700", shadow: "shadow-sm" },
  "orange-light": { bg: "bg-orange-500", border: "border-orange-600", text: "text-white", activeBg: "bg-orange-600", shadow: "shadow-sm" },
  red: { bg: "bg-red-600", border: "border-red-700", text: "text-white", activeBg: "bg-red-700", shadow: "shadow-sm" },
  "red-light": { bg: "bg-red-500", border: "border-red-600", text: "text-white", activeBg: "bg-red-600", shadow: "shadow-sm" },
  rose: { bg: "bg-rose-600", border: "border-rose-700", text: "text-white", activeBg: "bg-rose-700", shadow: "shadow-sm" },
  "rose-light": { bg: "bg-rose-500", border: "border-rose-600", text: "text-white", activeBg: "bg-rose-600", shadow: "shadow-sm" },
  pink: { bg: "bg-pink-600", border: "border-pink-700", text: "text-white", activeBg: "bg-pink-700", shadow: "shadow-sm" },
  "pink-light": { bg: "bg-pink-500", border: "border-pink-600", text: "text-white", activeBg: "bg-pink-600", shadow: "shadow-sm" },
  violet: { bg: "bg-violet-600", border: "border-violet-700", text: "text-white", activeBg: "bg-violet-700", shadow: "shadow-sm" },
  gray: { bg: "bg-gray-500", border: "border-gray-600", text: "text-white", activeBg: "bg-gray-600", shadow: "shadow-sm" },
  slate: { bg: "bg-slate-600", border: "border-slate-700", text: "text-white", activeBg: "bg-slate-700", shadow: "shadow-sm" },
  zinc: { bg: "bg-zinc-500", border: "border-zinc-600", text: "text-white", activeBg: "bg-zinc-600", shadow: "shadow-sm" },
};

interface MyTabProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onRowClick?: (row: Record<string, any>) => void;
  selectedRowId?: string | null;
  onBooleanChange?: (row: Record<string, any>, field: string, value: boolean) => void;
  icon?: React.ReactNode;
  title?: string;
  showUtilityColumn?: boolean;
  tableName?: string;
  filterFn?: (row: Record<string, any>) => boolean;
  newRecordDefaults?: Record<string, any>;
  onRecordSaved?: (record: Record<string, any>) => void;
  disableCrud?: boolean;
  filtroDeUnidad?: string;
  filtroDeBanco?: string;
  onDateStartClick?: (data: { fecha: string; id: string }) => void;
  onDateEndClick?: (data: { fecha: string; id: string }) => void;
  dateClickState?: "none" | "start";
  onReportes?: () => void;
  showReportes?: boolean;
  onGraficas?: () => void;
  onSubTabChange?: (subTabId: string) => void;
  dataTransform?: (data: Record<string, any>[]) => Record<string, any>[];
  endButtons?: React.ReactNode;
}

export default function MyTab({
  tabs,
  activeTab,
  onTabChange,
  onRowClick,
  selectedRowId,
  onBooleanChange,
  icon,
  title,
  showUtilityColumn,
  tableName: tableNameProp,
  filterFn,
  newRecordDefaults,
  onRecordSaved,
  disableCrud = false,
  filtroDeUnidad = "",
  filtroDeBanco = "",
  onDateStartClick,
  onDateEndClick,
  dateClickState = "none",
  onReportes,
  showReportes = false,
  onGraficas,
  onSubTabChange,
  dataTransform,
  endButtons,
}: MyTabProps) {
  const { 
    tableName: contextTableName, 
    tableData, 
    hasMore, 
    totalCount,
    onLoadMore, 
    onRefresh, 
    onRemove,
    onSaveNew, 
    onEdit, 
    onCopy,
    onDelete 
  } = useTableData();

  const { isAlegre } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;
  
  const tableName = tableNameProp || contextTableName;
  
  const currentTab = tabs.find((t) => t.id === activeTab);

  const [activeSubTab, setActiveSubTab] = useState<string>(() => {
    const current = tabs.find(t => t.id === activeTab);
    return current?.subTabs?.[0]?.id || "";
  });

  useEffect(() => {
    const current = tabs.find(t => t.id === activeTab);
    if (current?.subTabs && current.subTabs.length > 0) {
      const firstSub = current.subTabs[0].id;
      setActiveSubTab(firstSub);
      onSubTabChange?.(firstSub);
    } else {
      setActiveSubTab("");
      onSubTabChange?.("");
    }
  }, [activeTab]);
  const filteredData = useMemo(() => {
    const filtered = tableData.filter((row) => {
      if (!currentTab?.tipo || !matchesTipo(row.tipo, currentTab.tipo)) return false;
      if (filterFn && !filterFn(row)) return false;
      return true;
    });
    return dataTransform ? dataTransform(filtered) : filtered;
  }, [tableData, currentTab?.tipo, filterFn, dataTransform]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="flex flex-col h-full min-h-0 w-full min-w-0 p-3 bg-gradient-to-br from-violet-500/5 to-violet-600/10 border-violet-500/20">
          <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full min-h-0">
            <div className="mb-2 border-b pb-2">
              <div className="flex items-center gap-1 flex-wrap">
                {(icon || title) && (
                  <div className="flex items-center gap-1 px-1 cursor-default shrink-0" data-testid="tab-title">
                    {icon}
                    {title && (
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {title}:
                      </span>
                    )}
                  </div>
                )}
                <TabsList className="flex flex-wrap h-auto items-center justify-start gap-1 rounded-md bg-muted p-1 text-muted-foreground">
                  {tabs.map((tab) => {
                    const colorConfig = tab.color ? tabColorClasses[tab.color] : null;
                    const isActive = activeTab === tab.id;
                    
                    if (colorConfig) {
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className={`text-xs border-2 rounded-md transition-all font-semibold ${colorConfig.shadow} ${colorConfig.border} ${colorConfig.text === "text-black" ? "!text-black" : "!text-white"} ${
                            isActive 
                              ? `${colorConfig.activeBg} ring-2 ring-white scale-105` 
                              : `${colorConfig.bg}`
                          }`}
                          data-testid={`tab-${tab.id}`}
                          onClick={(e) => {
                            const el = e.currentTarget;
                            el.classList.remove("animate-flash");
                            void el.offsetWidth;
                            el.classList.add("animate-flash");
                          }}
                        >
                          {tab.label}
                        </TabsTrigger>
                      );
                    }
                    
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="text-xs"
                        data-testid={`tab-${tab.id}`}
                      >
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-0 h-full min-h-0 focus-visible:outline-none"
          >
            {activeTab === tab.id && (
              <div className="h-full min-h-0 p-2 overflow-hidden border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
                {tab.subTabs && tab.subTabs.length > 0 ? (
                  <div className="flex flex-col h-full min-h-0">
                    <div className="flex items-center gap-1 mb-2 flex-wrap">
                      {tab.subTabs.map((subTab) => {
                        const subColorConfig = subTab.color ? tabColorClasses[subTab.color] : null;
                        const isSubActive = activeSubTab === subTab.id;
                        return (
                          <button
                            key={subTab.id}
                            onClick={(e) => {
                              setActiveSubTab(subTab.id);
                              onSubTabChange?.(subTab.id);
                              const el = e.currentTarget;
                              el.classList.remove("animate-flash");
                              void el.offsetWidth;
                              el.classList.add("animate-flash");
                            }}
                            className={`text-xs px-3 py-1 border-2 rounded-md transition-all font-semibold ${
                              subColorConfig
                                ? `${subColorConfig.shadow} ${subColorConfig.border} ${subColorConfig.text === "text-black" ? "!text-black" : "!text-white"} ${
                                    isSubActive 
                                      ? `${subColorConfig.activeBg} ring-2 ring-white scale-105` 
                                      : `${subColorConfig.bg}`
                                  }`
                                : `${isSubActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`
                            }`}
                            data-testid={`subtab-${subTab.id}`}
                          >
                            {subTab.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {tab.subTabs.map((subTab) => (
                        activeSubTab === subTab.id && (
                          <div key={subTab.id} className="h-full min-h-0">
                            {subTab.component === "nomina-semanal-finca" ? (
                              <NominaSemanalFinca filtroDeUnidad={filtroDeUnidad} />
                            ) : subTab.component === "pago-semanal-proveedores" ? (
                              <PagoSemanalProveedores filtroDeUnidad={filtroDeUnidad} />
                            ) : subTab.component === "admin-parametros" ? (
                              <AdminParametros filtroDeUnidad={filtroDeUnidad} />
                            ) : subTab.hasGrid ? (
                              <MyGrid
                                key={`mytab-${tab.id}-${subTab.id}`}
                                tableId={`mytab-${tab.id}-${subTab.id}`}
                                tableName={tableName}
                                columns={tab.columns}
                                data={filteredData}
                                onRowClick={onRowClick}
                                selectedRowId={selectedRowId}
                                onCopy={onCopy}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onBooleanChange={onBooleanChange}
                                showUtilityColumn={showUtilityColumn}
                                hasMore={hasMore}
                                totalCount={totalCount}
                                onLoadMore={onLoadMore}
                                onSaveNew={onSaveNew}
                                onRefresh={onRefresh}
                                onRemove={onRemove}
                                currentTabName={tab.tipo}
                                newRecordDefaults={newRecordDefaults}
                                onRecordSaved={onRecordSaved}
                                disableCrud={disableCrud}
                                filtroDeUnidad={filtroDeUnidad}
                                filtroDeBanco={filtroDeBanco}
                                onDateStartClick={onDateStartClick}
                                onDateEndClick={onDateEndClick}
                                dateClickState={dateClickState}
                                onReportes={onReportes}
                                showReportes={showReportes}
                                onGraficas={onGraficas}
                                endButtons={endButtons}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                {subTab.label} - Próximamente
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ) : tab.id === "parametros" ? (
                  <AdminParametros filtroDeUnidad={filtroDeUnidad} />
                ) : (
                <MyGrid
                  key={`mytab-${tab.id}`}
                  tableId={`mytab-${tab.id}`}
                  tableName={tableName}
                  columns={tab.columns}
                  data={filteredData}
                  onRowClick={onRowClick}
                  selectedRowId={selectedRowId}
                  onCopy={onCopy}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onBooleanChange={onBooleanChange}
                  showUtilityColumn={showUtilityColumn}
                  hasMore={hasMore}
                  totalCount={totalCount}
                  onLoadMore={onLoadMore}
                  onSaveNew={onSaveNew}
                  onRefresh={onRefresh}
                  onRemove={onRemove}
                  currentTabName={tab.tipo}
                  newRecordDefaults={newRecordDefaults}
                  onRecordSaved={onRecordSaved}
                  disableCrud={disableCrud}
                  filtroDeUnidad={filtroDeUnidad}
                  filtroDeBanco={filtroDeBanco}
                  onDateStartClick={onDateStartClick}
                  onDateEndClick={onDateEndClick}
                  dateClickState={dateClickState}
                  onReportes={onReportes}
                  showReportes={showReportes}
                  onGraficas={onGraficas}
                  endButtons={endButtons}
                />
                )}
              </div>
            )}
          </TabsContent>
        ))}
          </div>
          </Tabs>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-indigo-600 text-white text-xs">
        MyTab
      </TooltipContent>
    </Tooltip>
  );
}
