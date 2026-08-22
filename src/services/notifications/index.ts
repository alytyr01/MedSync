import { Capacitor } from '@capacitor/core';
import type { Medicine } from '@/types';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { syncPushSubscription } from '@/services/push-subscriptions';
import {
  scheduleNativeAlarm,
  cancelNativeAlarm,
  cancelAllNativeAlarms,
  checkAlarmPermissions,
  requestAlarmPermissions,
  type AlarmPermissions,
} from '@/services/alarm';

/**
 * Notification Service
 *
 * On native (Android), medication reminders are scheduled as real
 * alarm-clock style alarms (full-screen + sound + vibration) via the
 * MedSyncAlarm plugin. No notification is shown - the alarm rings
 * and displays a full-screen UI just like the system alarm clock.
 *
 * On web, falls back to browser notifications.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Check all required permissions (notifications, exact alarm,
      // full-screen intent, battery optimization). If any are missing,
      // request them.
      const perms = await checkAlarmPermissions();
      if (!allPermissionsGranted(perms)) {
        await requestAlarmPermissions();
      }
      return true;
    }

    // Web fallback
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await syncPushSubscription();
      }
      return permission === 'granted';
    }
    return false;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

function allPermissionsGranted(perms: AlarmPermissions): boolean {
  return (
    perms.notifications &&
    perms.exactAlarm &&
    perms.fullScreenIntent &&
    perms.batteryOptimization &&
    perms.overlay
  );
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  } catch (error) {
    console.error('Failed to check notification permission:', error);
    return false;
  }
}

export async function scheduleMedicineReminder(
  medicine: Medicine,
  time: string
): Promise<void> {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);

    // If time already passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    if (Capacitor.isNativePlatform()) {
      // Schedule a native full-screen alarm (alarm clock style)
      await scheduleNativeAlarm(medicine, time);
    } else {
      // Web: create a server-side reminder row so the cron edge
      // function (send-reminder-push) fires even when the app is closed.
      await upsertServerReminder(medicine.id, time, scheduled);

      // Fallback timer for when the app IS open.
      const delay = scheduled.getTime() - now.getTime();
      setTimeout(() => {
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Time to take ${medicine.name}`, {
            body: `${medicine.dosage} - ${formatScheduleTime(time)}`,
            tag: `${medicine.id}-${time}`,
            icon: '/pwa-icons/pwa-192x192.png',
            badge: '/pwa-icons/pwa-192x192.png',
          });
        }
      }, delay);
    }
  } catch (error) {
    console.error('Failed to schedule reminder:', error);
  }
}

export async function scheduleAllMedicineReminders(
  medicines: Medicine[]
): Promise<void> {
  // Cancel all existing alarms first
  await cancelAllReminders();
  await clearServerReminders();

  for (const medicine of medicines) {
    for (const time of medicine.schedule_times) {
      await scheduleMedicineReminder(medicine, time);
    }
  }
}

export async function cancelReminder(
  medicineId: string,
  time: string
): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Cancel the native full-screen alarm
      await cancelNativeAlarm(medicineId, time);
    }
  } catch (error) {
    console.error('Failed to cancel reminder:', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Cancel all native full-screen alarms
      await cancelAllNativeAlarms();
    }
  } catch (error) {
    console.error('Failed to cancel all reminders:', error);
  }
}

export async function snoozeReminder(
  medicine: Medicine,
  time: string,
  minutes = 10
): Promise<void> {
  try {
    // First cancel the original alarm for this medicine/time
    await cancelReminder(medicine.id, time);

    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setMinutes(scheduled.getMinutes() + minutes);

    if (Capacitor.isNativePlatform()) {
      // Schedule a snoozed native alarm
      const snoozeTime = `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`;
      await scheduleNativeAlarm(medicine, snoozeTime);
    } else {
      // Web fallback - schedule snoozed alarm with setTimeout
      const delay = scheduled.getTime() - now.getTime();
      setTimeout(() => {
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Snoozed: ${medicine.name}`, {
            body: `${medicine.dosage} - ${formatScheduleTime(time)} (snoozed ${minutes} min)`,
            tag: `${medicine.id}-${time}-snoozed`,
            icon: '/pwa-icons/pwa-192x192.png',
            badge: '/pwa-icons/pwa-192x192.png',
          });
        }
      }, delay);
    }
  } catch (error) {
    console.error('Failed to snooze reminder:', error);
  }
}

// ===== Helpers =====

function formatScheduleTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

async function upsertServerReminder(medicineId: string, time: string, scheduled: Date): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;
  const timeKey = `${medicineId}-${time}`;
  await supabase.from('reminder_notifications').delete().eq('medicine_id', medicineId).eq('time_key', timeKey);
  const { error } = await supabase.from('reminder_notifications').insert({
    medicine_id: medicineId,
    title: 'Time to take your medicine',
    body: `Scheduled for ${formatScheduleTime(time)}`,
    time_key: timeKey,
    scheduled_for: scheduled.toISOString(),
  });
  if (error) console.error('Failed to create server reminder:', error);
}

async function clearServerReminders(): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;
  await supabase.from('reminder_notifications').delete().eq('user_id', user.id);
}