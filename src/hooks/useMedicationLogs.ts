import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMedicationLogs,
  getTodayLogs,
  logMedicationAction,
} from '@/services/supabase/database';
import type { LogStatus } from '@/types';
import { QUERY_KEYS } from '@/constants';

export function useMedicationLogs(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.logs, startDate, endDate],
    queryFn: () => getMedicationLogs(startDate, endDate),
    // Keep the previous range's data visible while the next range loads,
    // so switching 7D / 30D / 90D never flashes a loading state.
    placeholderData: (previousData) => previousData,
  });
}

export function useTodayLogs() {
  return useQuery({
    queryKey: [QUERY_KEYS.logs, 'today'],
    queryFn: getTodayLogs,
  });
}

export function useLogMedicationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      medicineId,
      scheduledTime,
      status,
      skippedReason,
    }: {
      medicineId: string;
      scheduledTime: string;
      status: Exclude<LogStatus, 'pending'>;
      skippedReason?: string;
    }) => logMedicationAction(medicineId, scheduledTime, status, skippedReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.logs] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
    },
  });
}