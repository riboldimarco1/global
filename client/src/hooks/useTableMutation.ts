import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { useTableData } from "@/contexts/TableDataContext";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";

type MutationMethod = "POST" | "PATCH" | "PUT" | "DELETE";

interface UseTableMutationOptions<TData = unknown, TVariables = unknown> {
  tableName?: string;
  method?: MutationMethod;
  buildUrl?: (variables: TVariables) => string;
  buildBody?: (variables: TVariables) => Record<string, any>;
  onSuccessMessage?: string;
  onErrorMessage?: string;
  skipRefresh?: boolean;
  useLocalUpdate?: boolean;
  additionalOnSuccess?: (data: TData, variables: TVariables) => void;
  additionalOnError?: (error: Error, variables: TVariables) => void;
}

export function useTableMutation<TData = unknown, TVariables = unknown>(
  options: UseTableMutationOptions<TData, TVariables> = {}
) {
  const { tableName: contextTableName, onRefresh } = useTableData();
  const { toast } = useToast();
  const { showPop } = useMyPop();

  const {
    tableName = contextTableName,
    method = "PATCH",
    buildUrl,
    buildBody,
    onSuccessMessage,
    onErrorMessage = "No se pudo completar la operación",
    skipRefresh = false,
    useLocalUpdate = false,
    additionalOnSuccess,
    additionalOnError,
  } = options;

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const url = buildUrl ? buildUrl(variables) : `/api/${tableName}`;
      const body = buildBody ? buildBody(variables) : variables;
      const res = await apiRequest(method, url, body);
      if (method === "POST") {
        return await res.json() as TData;
      }
      return res as unknown as TData;
    },
    onSuccess: (data, variables) => {
      if (!skipRefresh) {
        if (useLocalUpdate && data && typeof data === 'object') {
          onRefresh(data as Record<string, any>);
        } else {
          if (tableName) {
            queryClient.invalidateQueries({ queryKey: [`/api/${tableName}`] });
          }
          onRefresh();
        }
      }
      if (tableName) {
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith(`/api/${tableName}?`);
          }
        });
      }
      if (onSuccessMessage) {
        toast({
          title: "Éxito",
          description: onSuccessMessage,
        });
      }
      if (additionalOnSuccess) {
        additionalOnSuccess(data, variables);
      }
    },
    onError: (error, variables) => {
      showPop({
        title: "Error",
        message: onErrorMessage,
      });
      if (additionalOnError) {
        additionalOnError(error, variables);
      }
    },
  });
}

export function useUpdateMutation<TVariables extends { id: string | number; field: string; value: any }>(
  tableName?: string
) {
  const { tableName: contextTableName } = useTableData();
  const table = tableName || contextTableName;

  return useTableMutation<Record<string, any>, TVariables>({
    tableName: table,
    method: "PATCH",
    buildUrl: (vars) => `/api/${table}/${vars.id}`,
    buildBody: (vars) => ({ [vars.field]: vars.value }),
    onErrorMessage: "No se pudo actualizar el registro",
    useLocalUpdate: true,
  });
}

export function useDeleteMutation<TVariables extends { id: string | number }>(
  tableName?: string
) {
  const { tableName: contextTableName, onRemove } = useTableData();
  const table = tableName || contextTableName;

  return useTableMutation<unknown, TVariables>({
    tableName: table,
    method: "DELETE",
    buildUrl: (vars) => `/api/${table}/${vars.id}`,
    buildBody: () => ({}),
    onErrorMessage: "No se pudo eliminar el registro",
    skipRefresh: true,
    additionalOnSuccess: (_data, variables) => {
      onRemove(variables.id);
    },
  });
}

export function useCreateMutation<TVariables = Record<string, any>>(
  tableName?: string
) {
  const { tableName: contextTableName } = useTableData();
  const table = tableName || contextTableName;

  return useTableMutation<Record<string, any>, TVariables>({
    tableName: table,
    method: "POST",
    buildUrl: () => `/api/${table}`,
    onErrorMessage: "No se pudo crear el registro",
  });
}
