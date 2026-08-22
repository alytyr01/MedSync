package com.medsync.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Reschedules every medication alarm after:
 *  - device reboot (BOOT_COMPLETED / LOCKED_BOOT_COMPLETED)
 *  - app update (MY_PACKAGE_REPLACED)
 *  - system time / timezone changes (TIME_SET / TIMEZONE_CHANGED)
 *
 * Reads the persisted alarm list (saved by AlarmScheduler every time an
 * alarm is scheduled) and recreates every AlarmManager schedule with zero
 * user interaction — exactly like the system Clock app.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        boolean shouldReschedule =
                Intent.ACTION_BOOT_COMPLETED.equals(action)
                        || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action)
                        || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                        || Intent.ACTION_TIME_CHANGED.equals(action)
                        || Intent.ACTION_TIMEZONE_CHANGED.equals(action);

        if (!shouldReschedule) return;

        Log.d(TAG, "Rescheduling all medication alarms after: " + action);

        JSONArray alarms = AlarmScheduler.getAllAlarms(context);
        int count = 0;
        for (int i = 0; i < alarms.length(); i++) {
            try {
                JSONObject a = alarms.getJSONObject(i);
                AlarmScheduler.scheduleAlarm(
                        context,
                        a.getString("medicine_id"),
                        a.optString("medicine_name", "Medication"),
                        a.optString("dosage", ""),
                        a.optString("instructions", ""),
                        a.getString("time"),
                        a.getInt("request_code")
                );
                count++;
            } catch (Exception e) {
                Log.e(TAG, "Failed to reschedule alarm #" + i, e);
            }
        }
        Log.d(TAG, "Rescheduled " + count + " medication alarm(s)");
    }
}