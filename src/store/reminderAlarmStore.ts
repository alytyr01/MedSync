import { create } from 'zustand';
import type { Medicine } from '@/types';

export interface ActiveAlarm {
  medicine: Medicine;
  time: string;
  triggeredAt: number;
}

interface ReminderAlarmState {
  activeAlarm: ActiveAlarm | null;
  snoozedAlarms: Map<string, number>; // key: medicineId-time, value: snooze until timestamp
  triggerAlarm: (medicine: Medicine, time: string) => void;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes?: number) => void;
  isSnoozed: (medicineId: string, time: string) => boolean;
  clearExpiredSnoozes: () => void;
}

export const useReminderAlarmStore = create<ReminderAlarmState>()((set, get) => ({
  activeAlarm: null,
  snoozedAlarms: new Map(),

  triggerAlarm: (medicine, time) => {
    // Don't trigger if currently snoozed
    if (get().isSnoozed(medicine.id, time)) return;

    set({
      activeAlarm: {
        medicine,
        time,
        triggeredAt: Date.now(),
      },
    });
  },

  dismissAlarm: () => {
    set({ activeAlarm: null });
  },

  snoozeAlarm: (minutes = 10) => {
    const { activeAlarm } = get();
    if (!activeAlarm) return;

    const key = `${activeAlarm.medicine.id}-${activeAlarm.time}`;
    const snoozeUntil = Date.now() + minutes * 60 * 1000;

    set((state) => {
      const newSnoozes = new Map(state.snoozedAlarms);
      newSnoozes.set(key, snoozeUntil);
      return {
        snoozedAlarms: newSnoozes,
        activeAlarm: null,
      };
    });
  },

  isSnoozed: (medicineId, time) => {
    const key = `${medicineId}-${time}`;
    const snoozeUntil = get().snoozedAlarms.get(key);
    if (!snoozeUntil) return false;
    return Date.now() < snoozeUntil;
  },

  clearExpiredSnoozes: () => {
    const now = Date.now();
    set((state) => {
      const newSnoozes = new Map(state.snoozedAlarms);
      for (const [key, until] of newSnoozes) {
        if (now >= until) {
          newSnoozes.delete(key);
        }
      }
      return { snoozedAlarms: newSnoozes };
    });
  },
}));