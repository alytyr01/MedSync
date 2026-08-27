import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} from '@/services/supabase/database';
import type { MedicineFormValues } from '@/types';
import { QUERY_KEYS } from '@/constants';

export function useMedicines() {
  return useQuery({
    queryKey: [QUERY_KEYS.medicines],
    queryFn: getMedicines,
  });
}

export function useMedicine(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.medicine, id],
    queryFn: () => (id ? getMedicine(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MedicineFormValues) => createMedicine(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.medicines] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
    },
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<MedicineFormValues> }) =>
      updateMedicine(id, values),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.medicines] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.medicine, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
    },
  });
}

export function useDeleteMedicine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.medicines] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
    },
  });
}