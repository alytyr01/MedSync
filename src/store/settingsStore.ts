import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';
import { STORAGE_KEYS } from '@/constants';

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  toggleDarkMode: () => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  notificationsEnabled: true,
  reminderSound: true,
  vibration: true,
  lowStockAlerts: true,
  darkMode: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      toggleDarkMode: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            darkMode: !state.settings.darkMode,
          },
        })),

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: STORAGE_KEYS.settings,
    }
  )
);