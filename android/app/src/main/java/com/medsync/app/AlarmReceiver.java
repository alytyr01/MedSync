package com.medsync.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

/**
 * Fired by AlarmManager at the exact medication time.
 *
 * This is the heart of the native alarm-clock flow:
 *
 *   Medication time
 *        ↓
 *   AlarmManager fires (setAlarmClock → background-activity exemption)
 *        ↓
 *   AlarmReceiver.onReceive()
 *        ↓
 *   Wake the CPU + start foreground service (keeps process alive)
 *        ↓
 *   1) Launch AlarmFullscreenActivity DIRECTLY (works while app is closed
 *      thanks to the setAlarmClock background-start exemption)
 *   2) ALSO post a FULL-SCREEN INTENT notification as the guaranteed
 *      delivery vehicle: when the screen is off or the device is locked,
 *      Android AUTOMATICALLY launches the full-screen activity from it —
 *      no tap required. This is exactly how the stock Clock app delivers
 *      its alarms. The activity cancels the notification the instant it
 *      opens, so the user never sees or interacts with it.
 *
 * The user NEVER has to open the app or tap anything.
 */
public class AlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "AlarmReceiver";
    private static final String FSI_CHANNEL_ID = "medsync_alarm_fsi";
    private static final int FSI_NOTIFICATION_ID = 3001;

    @Override
    public void onReceive(final Context context, Intent intent) {
        if (intent == null) return;

        final String medicineId = intent.getStringExtra("medicine_id");
        final String medicineName = intent.getStringExtra("medicine_name");
        final String dosage = intent.getStringExtra("dosage");
        final String instructions = intent.getStringExtra("instructions");
        final String time = intent.getStringExtra("time");
        final int requestCode = intent.getIntExtra("request_code", -1);
        final boolean alarmSound = intent.getBooleanExtra("alarm_sound", true);
        final boolean alarmVibrate = intent.getBooleanExtra("alarm_vibrate", true);

        Log.d(TAG, "Medication alarm fired! medicine=" + medicineName + " time=" + time);

        // 1) Wake the CPU immediately so nothing delays the alarm screen.
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            @SuppressWarnings("deprecation")
            PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK
                            | PowerManager.ACQUIRE_CAUSES_WAKEUP
                            | PowerManager.ON_AFTER_RELEASE,
                    "MedSync::AlarmFiredWakeLock"
            );
            wakeLock.acquire(60 * 1000L); // enough for the activity to take over
        }

        // 2) Start the foreground service FIRST. While the alarm is actively
        //    ringing this keeps our process alive and exempt from background
        //    limits (mediaPlayback type, same as the system clock app).
        Intent serviceIntent = new Intent(context, AlarmService.class)
                .putExtra("medicine_id", medicineId)
                .putExtra("medicine_name", medicineName)
                .putExtra("dosage", dosage)
                .putExtra("instructions", instructions)
                .putExtra("time", time)
                .putExtra("request_code", requestCode);
        try {
            context.startForegroundService(serviceIntent);
        } catch (Exception e) {
            Log.e(TAG, "startForegroundService failed", e);
        }

        // 3) Build the full-screen alarm activity PendingIntent.
        Intent alarmIntent = new Intent(context, AlarmFullscreenActivity.class)
                .addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK
                                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                .putExtra("medicine_id", medicineId)
                .putExtra("medicine_name", medicineName)
                .putExtra("dosage", dosage)
                .putExtra("instructions", instructions)
                .putExtra("time", time)
                .putExtra("request_code", requestCode)
                .putExtra("alarm_sound", alarmSound)
                .putExtra("alarm_vibrate", alarmVibrate);

        PendingIntent fullScreenPi = PendingIntent.getActivity(
                context,
                requestCode,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 4) Post the FULL-SCREEN INTENT notification FIRST. On a locked
        //    device or with the screen off, the SYSTEM launches the activity
        //    from it automatically and turns the screen on — zero taps.
        //    Posting before the direct launch guarantees the activity's
        //    onCreate() can cancel it immediately, so the user never sees
        //    or interacts with any notification.
        postFullScreenIntentNotification(context, medicineName, dosage, fullScreenPi);

        // 5) Launch the activity DIRECTLY. With SYSTEM_ALERT_WINDOW granted
        //    and/or alarm-clock privileges from setAlarmClock(), this works
        //    even when the app is closed and the device is unlocked — the
        //    full-screen alarm appears INSTANTLY, no notification involved.
        try {
            context.startActivity(alarmIntent);
            Log.d(TAG, "Full-screen alarm activity launched directly from receiver");
        } catch (Exception e) {
            Log.w(TAG, "Direct launch blocked; full-screen intent will deliver", e);
        }
    }

    private void postFullScreenIntentNotification(
            Context context,
            String medicineName,
            String dosage,
            PendingIntent fullScreenPi
    ) {
        NotificationManager nm =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        createFsiChannel(nm);

        Notification.Builder builder =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? new Notification.Builder(context, FSI_CHANNEL_ID)
                        : new Notification.Builder(context);

        String title = "Medication alarm";
        String text = (medicineName != null && !medicineName.isEmpty())
                ? medicineName + (dosage != null && !dosage.isEmpty() ? " · " + dosage : "")
                : "Time to take your medicine";

        Notification notification = builder
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title)
                .setContentText(text)
                .setCategory(Notification.CATEGORY_ALARM)
                .setPriority(Notification.PRIORITY_MAX)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                // THE key line: tells Android to launch the full-screen
                // alarm activity automatically (screen on, over lock screen).
                .setFullScreenIntent(fullScreenPi, true)
                .build();

        try {
            nm.notify(FSI_NOTIFICATION_ID, notification);
            Log.d(TAG, "Full-screen intent notification posted");
        } catch (SecurityException e) {
            // USE_FULL_SCREEN_INTENT revoked by user (Android 14+ settings).
            // The direct activity launch (step 4) is still our primary path.
            Log.e(TAG, "Full-screen intent denied", e);
        }
    }

    private void createFsiChannel(NotificationManager nm) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    FSI_CHANNEL_ID,
                    "Medication alarms",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Launches the full-screen medication alarm");
            channel.setSound(null, null);          // sound comes from the activity
            channel.enableVibration(false);         // vibration comes from the activity
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }
    }
}