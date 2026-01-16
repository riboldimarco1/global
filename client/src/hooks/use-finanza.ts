import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FincaFinanza, PagoFinanza, InsertFincaFinanza, InsertPagoFinanza } from "@shared/schema";

export function useFinanza() {
  const fincasQuery = useQuery<FincaFinanza[]>({
    queryKey: ["/api/finanza/fincas"],
  });

  const pagosQuery = useQuery<PagoFinanza[]>({
    queryKey: ["/api/finanza/pagos"],
  });

  const createFincaMutation = useMutation({
    mutationFn: async (finca: InsertFincaFinanza) => {
      const response = await apiRequest("POST", "/api/finanza/fincas", finca);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finanza/fincas"] });
    },
  });

  const updateFincaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertFincaFinanza> }) => {
      const response = await apiRequest("PUT", `/api/finanza/fincas/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finanza/fincas"] });
    },
  });

  const deleteFincaMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/finanza/fincas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finanza/fincas"] });
    },
  });

  const createPagoMutation = useMutation({
    mutationFn: async (pago: InsertPagoFinanza) => {
      const response = await apiRequest("POST", "/api/finanza/pagos", pago);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finanza/pagos"] });
    },
  });

  const updatePagoMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertPagoFinanza> }) => {
      const response = await apiRequest("PUT", `/api/finanza/pagos/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finanza/pagos"] });
    },
  });

  const deletePagoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/finanza/pagos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finanza/pagos"] });
    },
  });

  const addFinca = async (finca: InsertFincaFinanza): Promise<FincaFinanza> => {
    return createFincaMutation.mutateAsync(finca);
  };

  const updateFinca = async (id: string, updates: Partial<InsertFincaFinanza>) => {
    return updateFincaMutation.mutateAsync({ id, updates });
  };

  const deleteFinca = async (id: string) => {
    return deleteFincaMutation.mutateAsync(id);
  };

  const addPago = async (pago: InsertPagoFinanza): Promise<PagoFinanza> => {
    return createPagoMutation.mutateAsync(pago);
  };

  const updatePago = async (id: string, updates: Partial<InsertPagoFinanza>) => {
    return updatePagoMutation.mutateAsync({ id, updates });
  };

  const deletePago = async (id: string) => {
    return deletePagoMutation.mutateAsync(id);
  };

  return {
    fincas: fincasQuery.data || [],
    pagos: pagosQuery.data || [],
    isLoading: fincasQuery.isLoading || pagosQuery.isLoading,
    isLoaded: !fincasQuery.isLoading && !pagosQuery.isLoading,
    addFinca,
    updateFinca,
    deleteFinca,
    addPago,
    updatePago,
    deletePago,
    isMutating: createFincaMutation.isPending || updateFincaMutation.isPending || 
                deleteFincaMutation.isPending || createPagoMutation.isPending || 
                updatePagoMutation.isPending || deletePagoMutation.isPending,
  };
}
