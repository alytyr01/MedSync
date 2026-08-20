import { useEffect } from 'react';
import { useMedicines } from '@/hooks/useMedicines';
import {
  scheduleAllMedicineReminders,
  cancelAllReminders,
} from '@/services/notifications';
import { useSettingsStore } from '@/store/settingsStore';
import { syncPushSubscription, clearPushSubscription } from '@/services/push-subscriptions';

/**
 * Schedules native local notifications for all medicines.
 * Runs on mount and whenever the medicine list changes.
 * Respects the user's notification setting.
 */
export function useReminderScheduler() {
  const { data: medicines } = useMedicines();
  const { settings } = useSettingsStore();
  const notificationsEnabled = settings.notificationsEnabled;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!notificationsEnabled) {
        await cancelAllReminders();
        await clearPushSubscription();
        return;
      }

      await syncPushSubscription();

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
  }, [medicines, notificationsEnabled]);
}