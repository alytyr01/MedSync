package com.medsync.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.ServiceCompat;

/**
 * Foreground service that runs ONLY while a medication alarm is actively
 * ringing.
 *
 * The alarm itself is AlarmFullscreenActivity (launched directly by
 * AlarmReceiver — no notification interaction). This service exists purely
 * to keep the process alive and exempt from background restrictions for as
 * long as the alarm is ringing, exactly like the system Clock app does.
 *
 * Its notification is SILENT: no sound, no vibration, no full-screen
 * intent. It is an OS requirement for foreground services, not part of
 * the alarm UX.
 */
public class AlarmService extends Service {

    private static final String TAG = "AlarmService";
    private static final String CHANNEL_ID = "medsync_alarm_ringing";
    private static final int NOTIFICATION_ID = 2001;

    /** Safety timeout: force-stop after 15 minutes of ringing. */
    private static final long MAX_RING_DURATION_MS = 15 * 60 * 1000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable autoStop = this::stopGracefully;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildSilentNotification();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(
                        this,
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "startForeground failed", e);
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception e2) {
                Log.e(TAG, "startForeground fallback failed", e2);
                stopSelf();
                return START_NOT_STICKY;
            }
        }

        // Safety net: never ring forever without user response.
        handler.removeCallbacks(autoStop);
        handler.postDelayed(autoStop, MAX_RING_DURATION_MS);

        return START_STICKY;
    }

    private Notification buildSilentNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent contentPi = PendingIntent.getActivity(
                this,
                NOTIFICATION_ID,
                contentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? new Notification.Builder(this, CHANNEL_ID)
                        : new Notification.Builder(this);

        return builder
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("MedSync")
                .setContentText("Medication alarm ringing")
                .setCategory(Notification.CATEGORY_ALARM)
                .setPriority(Notification.PRIORITY_LOW)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setContentIntent(contentPi)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Medication alarm",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps the medication alarm running while it rings");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setShowBadge(false);
            NotificationManager nm =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private void stopGracefully() {
        Log.d(TAG, "Auto-stopping alarm service after max ring duration");
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(autoStop);
        super.onDestroy();
    }
}