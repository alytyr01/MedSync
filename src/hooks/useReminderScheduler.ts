import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMedicines } from '@/hooks/useMedicines';
import {
  scheduleAllMedicineReminders,
  cancelAllReminders,
  requestNotificationPermission,
} from '@/services/notifications';
import { useSettingsStore } from '@/store/settingsStore';
import { syncPushSubscription, clearPushSubscription } from '@/services/push-subscriptions';
import { addAlarmActionListener, type AlarmActionEvent } from '@/services/alarm';
import { logMedicationAction } from '@/services/supabase/database';
import { QUERY_KEYS } from '@/constants';

/**
 * Schedules medication reminders for all medicines.
 * Runs on mount and whenever the medicine list changes.
 * Respects the user's notification setting.
 *
 * On native (Android), reminders are TRUE ALARM-CLOCK alarms via the
 * MedSyncAlarm plugin: at the scheduled time AlarmManager fires and a
 * full-screen ringing activity launches directly — no notification tap.
 *
 * This hook also listens for "alarmAction" events emitted by the native
 * alarm screen so Take / Snooze / Dismiss are recorded in medication
 * history.
 */
export function useReminderScheduler() {
  const { data: medicines } = useMedicines();
  const { settings } = useSettingsStore();
  const notificationsEnabled = settings.notificationsEnabled;
  const isNative = Capacitor.isNativePlatform();
  const queryClient = useQueryClient();

  // ===== Schedule / reschedule alarms =====
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!notificationsEnabled) {
        await cancelAllReminders();
        await clearPushSubscription();
        return;
      }

      // Request all required permissions (notifications, exact alarm,
      // full-screen intent, battery optimization) so the alarm works
      // even when app is closed
      await requestNotificationPermission();

      // On native Android, the full-screen alarm handles everything.
      // Clear any existing web push subscription so the cron edge
      // function does NOT send a regular push notification instead of
      // showing the full-screen alarm. Only sync push on non-native.
      if (isNative) {
        await clearPushSubscription();
      } else {
        await syncPushSubscription();
      }

      if (medicines && medicines.length > 0) {
        await scheduleAllMedicineReminders(medicines);
      }
    };

    run().catch((err) => {
      if (!cancelled) console.error('Failed to schedule reminders:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [medicines, notificationsEnabled, isNative]);

  // ===== Record Take / Snooze / Dismiss from the native alarm screen =====
  useEffect(() => {
    if (!isNative) return;

    let handle: PluginListenerHandle | null = null;
    let disposed = false;

    const handleAlarmAction = async (event: AlarmActionEvent) => {
      try {
        if (!event.medicineId || !event.time) return;

        if (event.action === 'taken') {
          await logMedicationAction(event.medicineId, event.time, 'taken');
        } else if (event.action.startsWith('snoozed')) {
          await logMedicationAction(event.medicineId, event.time, 'snoozed');
        } else if (event.action === 'dismissed') {
          await logMedicationAction(
            event.medicineId,
            event.time,
            'skipped',
            'Dismissed from alarm'
          );
        }

        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.logs] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
      } catch (error) {
        console.error('Failed to record alarm action:', error);
      }
    };

    addAlarmActionListener(handleAlarmAction).then((h) => {
      if (disposed && h) {
        h.remove();
      } else {
        handle = h;
      }
    });

    return () => {
      disposed = true;
      if (handle) handle.remove().catch(() => {});
    };
  }, [isNative, queryClient]);
}