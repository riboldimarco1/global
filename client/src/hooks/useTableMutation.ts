import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { useTableData } from "@/contexts/TableDataContext";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MutationMethod = "POST" | "PATCH" | "PUT" | "DELETE";

interface UseTableMutationOptions<TData = unknown, TVariables = unknown> {
  tableName?: string;
  method?: MutationMethod;
  buildUrl?: (variables: TVariables) => string;
  buildBody?: (variables: TVariables) => Record<string, any>;
  onSuccessMessage?: string;
  onErrorMessage?: string;
  skipRefresh?: boolean;
  additionalOnSuccess?: (data: TData, variables: TVariables) => void;
  additionalOnError?: (error: Error, variables: TVariables) => void;
}

export function useTableMutation<TData = unknown, TVariables = unknown>(
  options: UseTableMutationOptions<TData, TVariables> = {}
) {
  const { tableName: contextTableName, onRefresh } = useTableData();
  const { toast } = useToast();

  const {
    tableName = contextTableName,
    method = "PATCH",
    buildUrl,
    buildBody,
    onSuccessMessage,
    onErrorMessage = "No se pudo completar la operación",
    skipRefresh = false,
    additionalOnSuccess,
    additionalOnError,
  } = options;

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const url = buildUrl ? buildUrl(variables) : `/api/${tableName}`;
      const body = buildBody ? buildBody(variables) : variables;
      return apiRequest(method, url, body) as Promise<TData>;
    },
    onSuccess: (data, variables) => {
      if (tableName) {
        queryClient.invalidateQueries({ queryKey: [`/api/${tableName}`] });
      }
      if (!skipRefresh) {
        onRefresh();
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
      toast({
        title: "Error",
        description: onErrorMessage,
        variant: "destructive",
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

  return useTableMutation<unknown, TVariables>({
    tableName: table,
    method: "PATCH",
    buildUrl: (vars) => `/api/${table}/${vars.id}`,
    buildBody: (vars) => ({ [vars.field]: vars.value }),
    onErrorMessage: "No se pudo actualizar el registro",
  });
}

export function useDeleteMutation<TVariables extends { id: string | number }>(
  tableName?: string
) {
  const { tableName: contextTableName } = useTableData();
  const table = tableName || contextTableName;

  return useTableMutation<unknown, TVariables>({
    tableName: table,
    method: "DELETE",
    buildUrl: (vars) => `/api/${table}/${vars.id}`,
    buildBody: () => ({}),
    onErrorMessage: "No se pudo eliminar el registro",
  });
}

export function useCreateMutation<TVariables = Record<string, any>>(
  tableName?: string
) {
  const { tableName: contextTableName } = useTableData();
  const table = tableName || contextTableName;

  return useTableMutation<unknown, TVariables>({
    tableName: table,
    method: "POST",
    buildUrl: () => `/api/${table}`,
    onErrorMessage: "No se pudo crear el registro",
  });
}
