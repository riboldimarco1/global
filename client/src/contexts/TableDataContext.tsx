import { createContext, useContext } from "react";

export interface TableDataContextType {
  tableName: string;
  tableData: Record<string, any>[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  totalLoaded: number;
  onLoadMore: () => void;
  onRefresh: (newRecord?: Record<string, any>) => void;
  onEdit?: (row: Record<string, any>) => void;
  onCopy?: (row: Record<string, any>) => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
}

const defaultValue: TableDataContextType = {
  tableName: "",
  tableData: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  totalLoaded: 0,
  onLoadMore: () => {},
  onRefresh: () => {},
};

export const TableDataContext = createContext<TableDataContextType>(defaultValue);

export function useTableData() {
  return useContext(TableDataContext);
}
