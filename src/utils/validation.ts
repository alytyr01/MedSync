import { z } from 'zod';
import type { Frequency } from '@/types';

export const frequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'as_needed',
]);

export const medicineTypeSchema = z.enum([
  'tablet',
  'syrup',
  'capsule',
  'injection',
]);

export const mealRelationSchema = z.enum([
  'before_meal',
  'after_meal',
  'anytime',
]);

export const medicineSchema = z.object({
  name: z
    .string()
    .min(1, 'Medicine name is required')
    .max(100, 'Medicine name must be under 100 characters'),
  dosage: z
    .string()
    .min(1, 'Dosage is required')
    .max(50, 'Dosage must be under 50 characters'),
  frequency: frequencySchema,
  times_per_day: z
    .number()
    .int('Must be a whole number')
    .min(1, 'At least once per day')
    .max(6, 'Maximum 6 times per day'),
  schedule_times: z
    .array(z.string())
    .min(1, 'Add at least one schedule time')
    .max(6, 'Maximum 6 schedule times'),
  duration_days: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 day')
    .max(3650, 'Duration cannot exceed 10 years')
    .nullable(),
  start_date: z.string().min(1, 'Start date is required'),
  instructions: z
    .string()
    .max(500, 'Instructions must be under 500 characters')
    .nullable(),
  notes: z
    .string()
    .max(500, 'Notes must be under 500 characters')
    .nullable(),
  total_quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  low_stock_threshold: z.number().int().min(0, 'Threshold cannot be negative'),
  refill_reminder: z.boolean(),
  medicine_type: medicineTypeSchema.optional(),
  meal_relation: mealRelationSchema.optional(),
  end_date: z.string().optional(),
});

export type MedicineFormData = z.infer<typeof medicineSchema>;

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be under 15 digits')
    .regex(/^[\d\s()+-]+$/, 'Invalid phone number format'),
  relationship: z
    .string()
    .min(1, 'Relationship is required')
    .max(50, 'Relationship must be under 50 characters'),
  is_primary: z.boolean(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().nullable(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export function getFrequencyOptions(): { value: Frequency; label: string }[] {
  return [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'as_needed', label: 'As Needed' },
  ];
}