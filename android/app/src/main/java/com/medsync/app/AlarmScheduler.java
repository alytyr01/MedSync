package com.medsync.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Schedules and cancels medication alarms using Android's native
 * AlarmManager — exactly like the system Clock app.
 *
 * Strategy (in priority order):
 *  1. setAlarmClock()              — PRIMARY. Firing an alarm-clock alarm
 *     is a documented exemption that allows starting activities from the
 *     background (works when the app is closed), fires during Doze, and
 *     shows the alarm icon in the status bar like the system Clock.
 *  2. setExactAndAllowWhileIdle()  — fires on time even in Doze mode
 *     (requires exact-alarm permission, granted via USE_EXACT_ALARM or
 *      user-granted SCHEDULE_EXACT_ALARM).
 *  3. set()                        — last-resort inexact delivery.
 *
 * Every scheduled alarm is persisted to SharedPreferences so BootReceiver
 * can recreate ALL schedules after a device reboot with zero user action.
 */
public class AlarmScheduler {

    private static final String TAG = "AlarmScheduler";

    static final String ACTION_ALARM = "com.medsync.app.ACTION_MEDICATION_ALARM";
    private static final String PREFS = "medsync_alarms";
    private static final String KEY_ALARMS = "alarms";

    // ===== Public API =====================================================

    /**
     * Schedule an alarm at the next occurrence of "HH:mm".
     */
    public static void scheduleAlarm(
            Context context,
            String medicineId,
            String medicineName,
            String dosage,
            String instructions,
            String time,
            int requestCode
    ) {
        Calendar trigger = nextOccurrence(time);
        if (trigger == null) return;
        scheduleAlarmAt(context, medicineId, medicineName, dosage, instructions,
                time, requestCode, trigger.getTimeInMillis());
    }

    /**
     * Schedule an alarm at an explicit epoch timestamp (used for snooze).
     */
    public static void scheduleAlarmAt(
            Context context,
            String medicineId,
            String medicineName,
            String dosage,
            String instructions,
            String originalTime,
            int requestCode,
            long triggerAtMillis
    ) {
        if (medicineId == null) return;

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, AlarmReceiver.class)
                .setAction(ACTION_ALARM)
                .putExtra("medicine_id", medicineId)
                .putExtra("medicine_name", medicineName != null ? medicineName : "Medication")
                .putExtra("dosage", dosage != null ? dosage : "")
                .putExtra("instructions", instructions != null ? instructions : "")
                .putExtra("time", originalTime != null ? originalTime : "")
                .putExtra("request_code", requestCode);

        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Cancel any previous alarm using this request code first.
        try {
            am.cancel(pi);
        } catch (Exception ignored) {
        }

        boolean scheduled = false;

        // 1) ALARM CLOCK (primary): firing a setAlarmClock() alarm is a
        //    documented Android exemption that lets the receiver START AN
        //    ACTIVITY FROM THE BACKGROUND — this is what makes the alarm
        //    work when the app is completely closed, like the system Clock.
        //    It also fires during Doze and shows the alarm icon in the
        //    status bar, exactly like the built-in alarm clock.
        try {
            AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(
                    triggerAtMillis,
                    PendingIntent.getActivity(
                            context,
                            requestCode,
                            new Intent(context, MainActivity.class)
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    )
            );
            am.setAlarmClock(info, pi);
            scheduled = true;
            Log.d(TAG, "Scheduled ALARM_CLOCK alarm #" + requestCode);
        } catch (Exception e) {
            Log.w(TAG, "setAlarmClock failed", e);
        }

        // 2) Exact + allow-while-idle fallback: precise firing in Doze mode
        //    when the alarm-clock API is unavailable.
        if (!scheduled && canScheduleExactAlarms(am)) {
            try {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                scheduled = true;
                Log.d(TAG, "Scheduled EXACT allow-idle alarm #" + requestCode
                        + " at " + triggerAtMillis);
            } catch (SecurityException e) {
                Log.w(TAG, "setExactAndAllowWhileIdle denied", e);
            } catch (Exception e) {
                Log.w(TAG, "setExactAndAllowWhileIdle failed", e);
            }
        }

        // 3) Inexact last resort.
        if (!scheduled) {
            try {
                am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                Log.d(TAG, "Scheduled INEXACT alarm #" + requestCode);
            } catch (Exception e) {
                Log.e(TAG, "All alarm scheduling strategies failed", e);
            }
        }
    }

    public static void cancelAlarm(Context context, int requestCode) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, AlarmReceiver.class).setAction(ACTION_ALARM);
        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        am.cancel(pi);
        pi.cancel();
    }

    // ===== Persistence (for reboot rescheduling) ==========================

    public static void saveAlarm(
            Context context,
            String medicineId,
            String medicineName,
            String dosage,
            String instructions,
            String time,
            int requestCode
    ) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray alarms = new JSONArray(prefs.getString(KEY_ALARMS, "[]"));
            JSONArray filtered = new JSONArray();
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject a = alarms.getJSONObject(i);
                if (!a.getString("medicine_id").equals(medicineId)
                        || !a.getString("time").equals(time)) {
                    filtered.put(a);
                }
            }

            JSONObject alarm = new JSONObject();
            alarm.put("medicine_id", medicineId);
            alarm.put("medicine_name", medicineName != null ? medicineName : "Medication");
            alarm.put("dosage", dosage != null ? dosage : "");
            alarm.put("instructions", instructions != null ? instructions : "");
            alarm.put("time", time);
            alarm.put("request_code", requestCode);
            filtered.put(alarm);

            prefs.edit().putString(KEY_ALARMS, filtered.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to persist alarm", e);
        }
    }

    public static void removeAlarm(Context context, String medicineId, String time) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray alarms = new JSONArray(prefs.getString(KEY_ALARMS, "[]"));
            JSONArray filtered = new JSONArray();
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject a = alarms.getJSONObject(i);
                if (!a.getString("medicine_id").equals(medicineId)
                        || !a.getString("time").equals(time)) {
                    filtered.put(a);
                }
            }
            prefs.edit().putString(KEY_ALARMS, filtered.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to remove persisted alarm", e);
        }
    }

    public static JSONArray getAllAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            return new JSONArray(prefs.getString(KEY_ALARMS, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static void clearAllAlarms(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_ALARMS, "[]").apply();
    }

    // ===== Helpers ========================================================

    /** Next occurrence of "HH:mm" (today if still ahead, otherwise tomorrow). */
    public static Calendar nextOccurrence(String time) {
        if (time == null) return null;
        String[] parts = time.split(":");
        if (parts.length != 2) return null;
        try {
            int hour = Integer.parseInt(parts[0].trim());
            int minute = Integer.parseInt(parts[1].trim());
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

            Calendar c = Calendar.getInstance();
            c.set(Calendar.HOUR_OF_DAY, hour);
            c.set(Calendar.MINUTE, minute);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            if (c.getTimeInMillis() <= System.currentTimeMillis()) {
                c.add(Calendar.DAY_OF_YEAR, 1);
            }
            return c;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static int generateRequestCode(String medicineId, String time) {
        // Stable request code from medicine id + time (same algorithm as web).
        int hash = 0;
        String str = medicineId + "-" + time;
        for (int i = 0; i < str.length(); i++) {
            hash = (hash << 5) - hash + str.charAt(i);
            hash |= 0;
        }
        // Always non-negative (PendingIntent request codes must be >= 0).
        return hash & 0x7FFFFFFF;
    }

    private static boolean canScheduleExactAlarms(AlarmManager am) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                return am.canScheduleExactAlarms();
            } catch (Exception e) {
                return false;
            }
        }
        return true; // Pre-Android 12: exact alarms always allowed.
    }
}