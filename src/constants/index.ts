export const APP_NAME = 'MedSync';
export const APP_VERSION = '1.0.0';

export const COLORS = {
  primary: '#0F766E',
  primaryLight: '#1D9281',
  accent: '#14B8A6',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSoft: '#F5F7FA',
  surfaceMuted: '#F0F2F5',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderSubtle: '#F1F3F5',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
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