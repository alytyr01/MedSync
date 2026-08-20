import { supabase } from './client';
import type {
  Medicine,
  MedicationLog,
  Inventory,
  EmergencyContact,
  MedicineFormValues,
  ContactFormValues,
  LogStatus,
} from '@/types';
import { addDays, getTodayISO } from '@/utils/format';

// ===== Medicines =====

export async function getMedicines(): Promise<Medicine[]> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Medicine[]) ?? [];
}

export async function getMedicine(id: string): Promise<Medicine | null> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return (data as Medicine) ?? null;
}

export async function createMedicine(
  values: MedicineFormValues
): Promise<Medicine> {
  const endDate = values.duration_days
    ? addDays(values.start_date, values.duration_days)
    : null;

  const { data, error } = await supabase
    .from('medicines')
    .insert({
      name: values.name,
      dosage: values.dosage,
      frequency: values.frequency,
      times_per_day: values.times_per_day,
      schedule_times: values.schedule_times,
      duration_days: values.duration_days,
      start_date: values.start_date,
      end_date: endDate,
      instructions: values.instructions,
      notes: values.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Medicine;
}

export async function updateMedicine(
  id: string,
  values: Partial<MedicineFormValues>
): Promise<Medicine> {
  // Only pick fields that exist on the medicines table
  // (inventory-related fields belong to the inventory table)
  const updateData: Record<string, unknown> = {
    name: values.name,
    dosage: values.dosage,
    frequency: values.frequency,
    times_per_day: values.times_per_day,
    schedule_times: values.schedule_times,
    duration_days: values.duration_days,
    start_date: values.start_date,
    instructions: values.instructions,
    notes: values.notes,
  };

  // Remove undefined keys
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  if (values.duration_days && values.start_date) {
    updateData.end_date = addDays(values.start_date, values.duration_days);
  }

  const { data, error } = await supabase
    .from('medicines')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Medicine;
}

export async function deleteMedicine(id: string): Promise<void> {
  const { error } = await supabase.from('medicines').delete().eq('id', id);
  if (error) throw error;
}

// ===== Medication Logs =====

export async function getMedicationLogs(
  startDate?: string,
  endDate?: string
): Promise<MedicationLog[]> {
  let query = supabase
    .from('medication_logs')
    .select('*, medicines(name, dosage)')
    .order('scheduled_time', { ascending: false });

  if (startDate) {
    query = query.gte('scheduled_time', `${startDate}T00:00:00`);
  }
  if (endDate) {
    query = query.lte('scheduled_time', `${endDate}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as MedicationLog[]) ?? [];
}

export async function getTodayLogs(): Promise<MedicationLog[]> {
  const today = getTodayISO();
  return getMedicationLogs(today, today);
}

export async function logMedicationAction(
  medicineId: string,
  scheduledTime: string,
  status: Exclude<LogStatus, 'pending'>,
  skippedReason?: string
): Promise<MedicationLog> {
  const { data, error } = await supabase
    .from('medication_logs')
    .insert({
      medicine_id: medicineId,
      scheduled_time: scheduledTime,
      status,
      taken_at: status === 'taken' ? new Date().toISOString() : null,
      skipped_reason: skippedReason ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MedicationLog;
}

// ===== Inventory =====

export async function getInventory(): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, medicines(name, dosage)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as Inventory[]) ?? [];
}

export async function getLowStockInventory(): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, medicines(name, dosage)')
    .order('remaining_quantity', { ascending: true });

  if (error) throw error;
  const items = (data as unknown as Inventory[]) ?? [];
  return items.filter((item) => item.remaining_quantity <= item.low_stock_threshold);
}

export async function updateInventoryQuantity(
  id: string,
  remainingQuantity: number
): Promise<Inventory> {
  const { data, error } = await supabase
    .from('inventory')
    .update({ remaining_quantity: remainingQuantity })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Inventory;
}

export async function refillInventory(
  id: string,
  newQuantity: number
): Promise<Inventory> {
  const { data, error } = await supabase
    .from('inventory')
    .update({
      remaining_quantity: newQuantity,
      total_quantity: newQuantity,
      last_refilled_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Inventory;
}

// ===== Emergency Contacts =====

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as EmergencyContact[]) ?? [];
}

export async function createEmergencyContact(
  values: ContactFormValues
): Promise<EmergencyContact> {
  // If setting primary, unset existing primary
  if (values.is_primary) {
    await supabase
      .from('emergency_contacts')
      .update({ is_primary: false })
      .eq('is_primary', true);
  }

  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert(values)
    .select()
    .single();

  if (error) throw error;
  return data as EmergencyContact;
}

export async function updateEmergencyContact(
  id: string,
  values: Partial<ContactFormValues>
): Promise<EmergencyContact> {
  if (values.is_primary) {
    await supabase
      .from('emergency_contacts')
      .update({ is_primary: false })
      .eq('is_primary', true);
  }

  const { data, error } = await supabase
    .from('emergency_contacts')
    .update(values)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EmergencyContact;
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ===== Auth =====

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}