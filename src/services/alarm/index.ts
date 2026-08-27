import { Capacitor } from '@capacitor/core';
import type { Medicine } from '@/types';

/**
 * Native full-screen alarm service.
 *
 * Uses the custom Capacitor plugin (MedSyncAlarm) on Android to schedule
 * real alarm-clock style alarms: at the scheduled time AlarmManager fires,
 * a BroadcastReceiver wakes the device and launches a full-screen ringing
 * activity directly — NO notification is ever shown or tapped.
 *
 * The plugin also emits "alarmAction" events when the user interacts with
 * the ringing alarm (Take Medicine / Snooze / Dismiss) so medication
 * history can be logged.
 */

export interface AlarmPermissions {
  notifications: boolean;
  exactAlarm: boolean;
  fullScreenIntent: boolean;
  batteryOptimization: boolean;
  /** "Display over other apps" — enables instant background launch */
  overlay: boolean;
}

/** Action reported by the native alarm screen. */
export type AlarmAction = 'taken' | 'dismissed' | 'snoozed:5' | 'snoozed:10';

export interface AlarmActionEvent {
  action: AlarmAction | string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  /** Original scheduled time "HH:mm" */
  time: string;
}

interface PluginListenerHandle {
  remove(): Promise<void>;
}

interface AlarmPlugin {
  scheduleAlarm(options: {
    medicineId: string;
    medicineName: string;
    dosage: string;
    instructions: string;
    time: string;
    /** Play the alarm ringtone while the full-screen alarm is up */
    sound: boolean;
    /** Vibrate while the full-screen alarm is up */
    vibrate: boolean;
  }): Promise<{ requestCode: number }>;
  cancelAlarm(options: { medicineId: string; time: string }): Promise<void>;
  cancelAllAlarms(): Promise<void>;
  /** Local low-stock restock nudge (own Android notification channel) */
  showLowStockNotification(options: {
    medicineName: string;
    remaining: number;
  }): Promise<void>;
  checkPermissions(): Promise<AlarmPermissions>;
  requestPermissions(): Promise<AlarmPermissions>;
  addListener(
    eventName: 'alarmAction',
    listenerFunc: (event: AlarmActionEvent) => void
  ): Promise<PluginListenerHandle>;
}

function getPlugin(): AlarmPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  const plugin = (Capacitor as any).Plugins?.MedSyncAlarm as AlarmPlugin | undefined;
  return plugin ?? null;
}

// ===== Scheduling ======================================================

export async function scheduleNativeAlarm(
  medicine: Medicine,
  time: string,
  sound: boolean,
  vibrate: boolean
): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.scheduleAlarm({
      medicineId: medicine.id,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      instructions: medicine.instructions ?? '',
      time,
      sound,
      vibrate,
    });
  } catch (error) {
    console.error('Failed to schedule native alarm:', error);
  }
}

// ===== Low stock alerts =================================================

/**
 * Local "running low" nudge — native notification on Android, browser
 * notification on web. Deduplication/threshold logic lives in
 * useLowStockAlerts; this wrapper only handles delivery.
 */
export async function notifyLowStock(
  medicineName: string,
  remaining: number
): Promise<void> {
  const unit = remaining === 1 ? 'dose' : 'doses';
  const title = `${medicineName} is running low`;
  const body = `About ${remaining} ${unit} left — time to refill.`;

  const plugin = getPlugin();
  if (plugin) {
    try {
      await plugin.showLowStockNotification({
        medicineName,
        remaining,
      });
      return;
    } catch (error) {
      console.error('Failed to show low stock notification:', error);
    }
  }

  // Web fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      tag: `medsync-low-stock-${medicineName}`,
      icon: '/pwa-icons/pwa-192x192.png',
      badge: '/pwa-icons/pwa-192x192.png',
    });
  }
}

export async function cancelNativeAlarm(
  medicineId: string,
  time: string
): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancelAlarm({ medicineId, time });
  } catch (error) {
    console.error('Failed to cancel native alarm:', error);
  }
}

export async function cancelAllNativeAlarms(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancelAllAlarms();
  } catch (error) {
    console.error('Failed to cancel all native alarms:', error);
  }
}

// ===== Permissions =====================================================

/**
 * Check all required permissions for the alarm to work.
 * Returns status for notifications, exact alarm, full-screen intent,
 * and battery optimization.
 */
export async function checkAlarmPermissions(): Promise<AlarmPermissions> {
  const plugin = getPlugin();
  if (!plugin) {
    return { notifications: true, exactAlarm: true, fullScreenIntent: true, batteryOptimization: true, overlay: true };
  }
  try {
    return await plugin.checkPermissions();
  } catch (error) {
    console.error('Failed to check alarm permissions:', error);
    return { notifications: true, exactAlarm: true, fullScreenIntent: true, batteryOptimization: true, overlay: true };
  }
}

/**
 * Request all required permissions for the alarm to work.
 * Shows the system dialogs for notifications, exact alarms,
 * full-screen intent, and battery-optimization exemption.
 */
export async function requestAlarmPermissions(): Promise<AlarmPermissions> {
  const plugin = getPlugin();
  if (!plugin) {
    return { notifications: true, exactAlarm: true, fullScreenIntent: true, batteryOptimization: true, overlay: true };
  }
  try {
    return await plugin.requestPermissions();
  } catch (error) {
    console.error('Failed to request alarm permissions:', error);
    return { notifications: false, exactAlarm: false, fullScreenIntent: false, batteryOptimization: false, overlay: false };
  }
}

// ===== Alarm action events =============================================

/**
 * Listen for user interactions with the ringing native alarm screen.
 *
 * Fired when the user taps Take Medicine ("taken"), Dismiss ("dismissed")
 * or Snooze ("snoozed:5" / "snoozed:10") on the full-screen alarm.
 * Returns a handle; call handle.remove() to stop listening.
 */
export async function addAlarmActionListener(
  callback: (event: AlarmActionEvent) => void
): Promise<PluginListenerHandle | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.addListener('alarmAction', callback);
  } catch (error) {
    console.error('Failed to add alarm action listener:', error);
    return null;
  }
}