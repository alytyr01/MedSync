// ===== Database Types =====

export interface Medicine {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  image_url?: string | null;
  frequency: Frequency;
  times_per_day: number;
  schedule_times: string[]; // e.g. ["08:00", "14:00", "20:00"]
  duration_days: number | null;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: string;
  user_id: string;
  medicine_id: string;
  scheduled_time: string;
  taken_at: string | null;
  status: LogStatus;
  skipped_reason: string | null;
  created_at: string;
}

export interface Inventory {
  id: string;
  user_id: string;
  medicine_id: string;
  total_quantity: number;
  remaining_quantity: number;
  low_stock_threshold: number;
  refill_reminder: boolean;
  last_refilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
}

// ===== Enums =====

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'as_needed';

export type MedicineType = 'tablet' | 'syrup' | 'capsule' | 'injection';

export type MealRelation = 'before_meal' | 'after_meal' | 'anytime';

export type LogStatus = 'taken' | 'skipped' | 'snoozed' | 'missed' | 'pending';

export type ReminderAction = 'taken' | 'skip' | 'snooze';

// ===== Scan / AI Types =====

export interface ScannedMedicine {
  name: string;
  strength: string;
  dosage: string;
  frequency: Frequency;
  times_per_day: number;
  schedule_times: string[];
  duration_days: number | null;
  instructions: string | null;
  confidence: number; // 0-100
}

export interface ScanResult {
  medicines: ScannedMedicine[];
  rawText: string;
  confidence: number;
  imageQuality?: ImageQualityReport;
  validation?: ValidationReport;
}

export interface ImageQualityReport {
  blur: number; // 0-100 (lower = sharper)
  lighting: number; // 0-100 (lower = darker)
  crop: boolean;
  orientation: 'portrait' | 'landscape' | 'unknown';
  readable: boolean;
  warning?: string;
}

export interface ValidationWarning {
  medicineIndex: number;
  field: string;
  message: string;
}

export interface ValidationReport {
  warnings: ValidationWarning[];
  duplicateCount: number;
  missingFieldCount: number;
  overallConfidence: number; // 0-100
  hasIssues: boolean;
}

// ===== Form Types =====

export interface MedicineFormValues {
  name: string;
  dosage: string;
  frequency: Frequency;
  times_per_day: number;
  schedule_times: string[];
  duration_days: number | null;
  start_date: string;
  instructions: string | null;
  notes: string | null;
  total_quantity: number;
  low_stock_threshold: number;
  refill_reminder: boolean;
  medicine_type?: MedicineType;
  meal_relation?: MealRelation;
  end_date?: string;
}

export interface ContactFormValues {
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

// ===== Notification Types =====

export interface ReminderNotification {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  action: ReminderAction;
}

// ===== Settings Types =====

export interface AppSettings {
  notificationsEnabled: boolean;
  reminderSound: boolean;
  vibration: boolean;
  lowStockAlerts: boolean;
  darkMode: boolean;
}

// ===== API Response Types =====

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface DashboardData {
  todayMedicines: Medicine[];
  upcomingReminders: ReminderNotification[];
  dailyProgress: {
    taken: number;
    total: number;
    percentage: number;
  };
  lowStock: Inventory[];
}