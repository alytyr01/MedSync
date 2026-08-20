import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Medicine } from '@/types';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
  NOTIFICATION_CHANNEL_DESC,
} from '@/constants';

/**
 * Notification Service
 *
 * Uses Capacitor Local Notifications for native reminders.
 * Falls back to browser notifications on web.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    }

    // Web fallback
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
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

    const notificationId = generateNotificationId(medicine.id, time);

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: `Time to take ${medicine.name}`,
            body: `${medicine.dosage} - ${formatScheduleTime(time)}`,
            schedule: {
              at: scheduled,
              allowWhileIdle: true,
            },
            sound: 'default',
            smallIcon: 'ic_stat_medsync',
            channelId: NOTIFICATION_CHANNEL_ID,
            extra: {
              medicineId: medicine.id,
              scheduledTime: time,
            },
          },
        ],
      });
    } else {
      // Web fallback - schedule with setTimeout
      const delay = scheduled.getTime() - now.getTime();
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Time to take ${medicine.name}`, {
            body: `${medicine.dosage} - ${formatScheduleTime(time)}`,
            tag: notificationId.toString(),
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
  // Cancel all existing notifications first
  await cancelAllReminders();

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
    const notificationId = generateNotificationId(medicineId, time);
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
    }
  } catch (error) {
    console.error('Failed to cancel reminder:', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancelAll();
    }
  } catch (error) {
    console.error('Failed to cancel all reminders:', error);
  }
}

export async function setupNotificationChannel(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: NOTIFICATION_CHANNEL_NAME,
        description: NOTIFICATION_CHANNEL_DESC,
        importance: 5, // HIGH
        visibility: 1, // PUBLIC
        sound: 'default',
        vibration: true,
      });
    }
  } catch (error) {
    console.error('Failed to setup notification channel:', error);
  }
}

export async function snoozeReminder(
  medicine: Medicine,
  time: string,
  minutes = 10
): Promise<void> {
  try {
    // First cancel the original reminder for this medicine/time
    await cancelReminder(medicine.id, time);

    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setMinutes(scheduled.getMinutes() + minutes);

    const notificationId = generateNotificationId(medicine.id, time) + 1000;

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: `Snoozed: ${medicine.name}`,
            body: `${medicine.dosage} - ${formatScheduleTime(time)} (snoozed ${minutes} min)`,
            schedule: {
              at: scheduled,
              allowWhileIdle: true,
            },
            sound: 'default',
            smallIcon: 'ic_stat_medsync',
            channelId: NOTIFICATION_CHANNEL_ID,
            extra: {
              medicineId: medicine.id,
              scheduledTime: time,
              snoozed: true,
            },
          },
        ],
      });
    }
  } catch (error) {
    console.error('Failed to snooze reminder:', error);
  }
}

// ===== Helpers =====

function generateNotificationId(medicineId: string, time: string): number {
  // Generate a stable numeric ID from medicine ID + time
  let hash = 0;
  const str = `${medicineId}-${time}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

function formatScheduleTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}