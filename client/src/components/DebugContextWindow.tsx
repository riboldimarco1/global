import { useTableData } from "@/contexts/TableDataContext";

export default function DebugContextWindow() {
  const { tableName, tableData, hasMore, isLoading, isLoadingMore, totalLoaded } = useTableData();

  return (
    <div 
      className="fixed top-4 right-4 z-[99999] bg-red-600 text-white p-4 rounded-lg shadow-2xl min-w-[250px]"
    >
      <div className="font-bold mb-2 border-b border-white/50 pb-1">DEBUG CONTEXTO</div>
      <div className="text-sm space-y-1">
        <div>tableName = "{tableName}"</div>
        <div>tableData.length = {tableData.length}</div>
        <div>totalLoaded = {totalLoaded}</div>
        <div>hasMore = {String(hasMore)}</div>
        <div>isLoading = {String(isLoading)}</div>
        <div>isLoadingMore = {String(isLoadingMore)}</div>
      </div>
    </div>
  );
}
