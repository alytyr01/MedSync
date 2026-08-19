export const APP_NAME = 'MedSync';
export const APP_VERSION = '1.0.0';

export const COLORS = {
  primary: '#2D6A4F',
  primaryLight: '#40916C',
  primaryDark: '#1B4332',
  primarySoft: '#D8F3DC',
  background: '#FAFAF8',
  surface: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  border: '#E5E7EB',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
} as const;

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as_needed', label: 'As Needed' },
] as const;

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  as_needed: 'As Needed',
};

export const DEFAULT_SCHEDULE_TIMES = ['08:00', '14:00', '20:00'];

export const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export const LOW_STOCK_THRESHOLD = 5;

export const STORAGE_KEYS = {
  settings: 'medsync_settings',
  theme: 'medsync_theme',
  onboarded: 'medsync_onboarded',
} as const;

export const ROUTES = {
  home: '/',
  scan: '/scan',
  medicines: '/medicines',
  medicineDetail: '/medicines/:id',
  inventory: '/inventory',
  history: '/history',
  settings: '/settings',
  contacts: '/contacts',
} as const;

export const QUERY_KEYS = {
  medicines: 'medicines',
  medicine: 'medicine',
  inventory: 'inventory',
  logs: 'medication-logs',
  contacts: 'emergency-contacts',
  dashboard: 'dashboard',
} as const;

export const NOTIFICATION_CHANNEL_ID = 'medsync-reminders';
export const NOTIFICATION_CHANNEL_NAME = 'Medication Reminders';
export const NOTIFICATION_CHANNEL_DESC = 'Reminders for your medications';