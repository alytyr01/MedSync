import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '@/services/supabase/database';
import type { ContactFormValues } from '@/types';
import { QUERY_KEYS } from '@/constants';

export function useEmergencyContacts() {
  return useQuery({
    queryKey: [QUERY_KEYS.contacts],
    queryFn: getEmergencyContacts,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ContactFormValues) => createEmergencyContact(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contacts] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Partial<ContactFormValues>;
    }) => updateEmergencyContact(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contacts] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmergencyContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contacts] });
    },
  });
}