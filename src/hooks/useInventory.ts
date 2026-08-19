import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getInventory,
  getLowStockInventory,
  updateInventoryQuantity,
  refillInventory,
} from '@/services/supabase/database';
import { QUERY_KEYS } from '@/constants';

export function useInventory() {
  return useQuery({
    queryKey: [QUERY_KEYS.inventory],
    queryFn: getInventory,
  });
}

export function useLowStockInventory() {
  return useQuery({
    queryKey: [QUERY_KEYS.inventory, 'low-stock'],
    queryFn: getLowStockInventory,
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateInventoryQuantity(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
    },
  });
}

export function useRefillInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      refillInventory(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
    },
  });
}