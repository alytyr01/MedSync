import { useEffect, useRef } from 'react';
import { useMedicines } from '@/hooks/useMedicines';
import { useReminderAlarmStore } from '@/store/reminderAlarmStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTodayLogs } from '@/hooks/useMedicationLogs';

/**
 * Monitors the current time and triggers the in-app alarm
 * when a medicine's scheduled time is reached.
 */
export function useReminderAlarm() {
  const { data: medicines } = useMedicines();
  const { settings } = useSettingsStore();
  const { triggerAlarm, clearExpiredSnoozes, isSnoozed } = useReminderAlarmStore();
  const { data: todayLogs } = useTodayLogs();

  // Track which alarms have been triggered to avoid re-triggering
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.notificationsEnabled) return;
    if (!medicines || medicines.length === 0) return;

    // Build set of already-logged reminders
    const loggedKeys = new Set(
      (todayLogs ?? []).map(
        (log) => `${log.medicine_id}-${log.scheduled_time.slice(11, 16)}`
      )
    );

    // Clear expired snoozes
    clearExpiredSnoozes();

    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      for (const medicine of medicines) {
        for (const time of medicine.schedule_times) {
          const key = `${medicine.id}-${time}`;

          // Skip if already triggered, logged, or snoozed
          if (triggeredRef.current.has(key)) continue;
          if (loggedKeys.has(key)) continue;
          if (isSnoozed(medicine.id, time)) continue;

          // Check if it's time for this medicine (within the current minute)
          if (time === currentTime) {
            triggerAlarm(medicine, time);
            triggeredRef.current.add(key);
          }
        }
      }
    };

    // Check immediately and then every 30 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 30 * 1000);

    return () => clearInterval(interval);
  }, [medicines, todayLogs, settings.notificationsEnabled, triggerAlarm, clearExpiredSnoozes, isSnoozed]);

  // Reset triggered alarms when medicines change
  useEffect(() => {
    triggeredRef.current.clear();
  }, [medicines]);
}