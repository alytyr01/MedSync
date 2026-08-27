package com.medsync.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor plugin ("MedSyncAlarm") that lets the web app schedule and
 * cancel native full-screen medication alarms — alarm-clock style.
 *
 * No notification is ever shown for the alarm itself: AlarmReceiver
 * launches AlarmFullscreenActivity directly at the scheduled time.
 *
 * When the user interacts with the ringing alarm (Take / Snooze /
 * Dismiss), the activity calls {@link #emitAlarmAction} which fires an
 * "alarmAction" event to JavaScript so medication history stays in sync.
 */
@CapacitorPlugin(
        name = "MedSyncAlarm",
        permissions = {
                @Permission(
                        alias = "notifications",
                        strings = {Manifest.permission.POST_NOTIFICATIONS}
                )
        }
)
public class AlarmPlugin extends Plugin {

    /** Static reference so non-Capacitor classes (the alarm activity)
     *  can emit events to the web layer. */
    private static volatile AlarmPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    /**
     * Called by AlarmFullscreenActivity when the user takes / snoozes /
     * dismisses a ringing alarm. Fires "alarmAction" to JavaScript.
     */
    public static void emitAlarmAction(
            String action,
            String medicineId,
            String medicineName,
            String dosage,
            String time
    ) {
        AlarmPlugin plugin = instance;
        if (plugin == null) return;
        try {
            JSObject data = new JSObject();
            data.put("action", action);
            data.put("medicineId", medicineId != null ? medicineId : "");
            data.put("medicineName", medicineName != null ? medicineName : "");
            data.put("dosage", dosage != null ? dosage : "");
            data.put("time", time != null ? time : "");
            plugin.notifyListeners("alarmAction", data);
        } catch (Exception ignored) {
        }
    }

    // ===== Low stock ======================================================

    /**
     * Posts a local "running low" nudge on its own notification channel so
     * users can mute stock reminders independently of the alarm channel.
     * Called from useLowStockAlerts when inventory crosses a threshold and
     * the Low Stock Alerts setting is enabled.
     */
    @PluginMethod
    public void showLowStockNotification(PluginCall call) {
        Context context = getContext();
        String medicineName = call.getString("medicineName");
        Integer remaining = call.getInt("remaining");
        if (medicineName == null || medicineName.isEmpty()) {
            medicineName = "A medicine";
        }
        int left = remaining != null ? remaining : 0;

        NotificationManager nm =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) {
            call.resolve();
            return;
        }

        final String channelId = "medsync_low_stock";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Low stock alerts",
                    NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Reminders to refill medicines running low");
            nm.createNotificationChannel(channel);
        }

        String title = medicineName + " is running low";
        String text = "About " + left + " dose" + (left == 1 ? "" : "s")
                + " left — time to refill.";

        Notification.Builder builder =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? new Notification.Builder(context, channelId)
                        : new Notification.Builder(context);

        Notification notification = builder
                .setSmallIcon(android.R.drawable.stat_sys_warning)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .build();

        try {
            nm.notify(("low-" + medicineName).hashCode(), notification);
            call.resolve();
        } catch (SecurityException e) {
            // POST_NOTIFICATIONS not granted yet — silently skip.
            Log.w("MedSyncAlarm", "Low stock alert skipped (no permission)", e);
            call.resolve();
        }
    }

    // ===== Scheduling =====================================================

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        Context context = getContext();
        String medicineId = call.getString("medicineId");
        String medicineName = call.getString("medicineName");
        String dosage = call.getString("dosage");
        String instructions = call.getString("instructions");
        String time = call.getString("time");
        boolean sound = call.getBoolean("sound", true);
        boolean vibrate = call.getBoolean("vibrate", true);

        if (medicineId == null || time == null) {
            call.reject("medicineId and time are required");
            return;
        }

        int requestCode = AlarmScheduler.generateRequestCode(medicineId, time);

        AlarmScheduler.scheduleAlarm(
                context,
                medicineId,
                medicineName != null ? medicineName : "Medication",
                dosage != null ? dosage : "",
                instructions != null ? instructions : "",
                time,
                requestCode,
                sound,
                vibrate
        );

        // Persist for rescheduling after reboot.
        AlarmScheduler.saveAlarm(
                context,
                medicineId,
                medicineName,
                dosage,
                instructions,
                time,
                requestCode,
                sound,
                vibrate
        );

        JSObject result = new JSObject();
        result.put("requestCode", requestCode);
        call.resolve(result);
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        Context context = getContext();
        String medicineId = call.getString("medicineId");
        String time = call.getString("time");

        if (medicineId == null || time == null) {
            call.reject("medicineId and time are required");
            return;
        }

        int requestCode = AlarmScheduler.generateRequestCode(medicineId, time);
        AlarmScheduler.cancelAlarm(context, requestCode);
        AlarmScheduler.removeAlarm(context, medicineId, time);

        call.resolve();
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        Context context = getContext();
        org.json.JSONArray alarms = AlarmScheduler.getAllAlarms(context);
        for (int i = 0; i < alarms.length(); i++) {
            try {
                int requestCode = alarms.getJSONObject(i).getInt("request_code");
                AlarmScheduler.cancelAlarm(context, requestCode);
            } catch (Exception ignored) {
            }
        }
        AlarmScheduler.clearAllAlarms(context);
        call.resolve();
    }

    // ===== Permissions ====================================================

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notifications", hasNotificationPermission());
        result.put("exactAlarm", hasExactAlarmPermission());
        result.put("fullScreenIntent", hasFullScreenIntentPermission());
        result.put("batteryOptimization", isIgnoringBatteryOptimizations());
        result.put("overlay", hasOverlayPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        saveCall(call);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && !hasNotificationPermission()) {
            requestPermissionForAlias("notifications", call, "permissionCallback");
            return;
        }

        requestOtherPermissions();
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        requestOtherPermissions();
    }

    private void requestOtherPermissions() {
        // Exact alarm permission (Android 12+).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasExactAlarmPermission()) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivityWithCheck(intent);
            } catch (Exception ignored) {
            }
        }

        // Full-screen intent permission (Android 14+ can revoke it).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
                && !hasFullScreenIntentPermission()) {
            try {
                Intent intent =
                        new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivityWithCheck(intent);
            } catch (Exception ignored) {
            }
        }

        // Overlay ("Display over other apps") — holding this permission is
        // a documented exemption that lets the alarm receiver start the
        // full-screen activity from the background INSTANTLY, even when
        // the app is closed and the device is unlocked (no notification).
        if (!hasOverlayPermission()) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivityWithCheck(intent);
            } catch (Exception ignored) {
            }
        }

        // Battery optimization exemption (critical on Xiaomi/Oppo/Vivo/
        // Realme/Tecno/Infinix/Huawei etc.).
        requestIgnoreBatteryOptimizations();

        finishPermissionRequest();
    }

    private void requestIgnoreBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !isIgnoringBatteryOptimizations()) {
            try {
                Intent intent =
                        new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivityWithCheck(intent);
            } catch (Exception e) {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivityWithCheck(intent);
                } catch (Exception ignored) {
                }
            }
        }
    }

    private void startActivityWithCheck(Intent intent) {
        try {
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        } catch (Exception ignored) {
            // Some settings activities aren't available on all OEMs.
        }
    }

    private void finishPermissionRequest() {
        PluginCall call = getSavedCall();
        if (call == null) return;
        JSObject result = new JSObject();
        result.put("notifications", hasNotificationPermission());
        result.put("exactAlarm", hasExactAlarmPermission());
        result.put("fullScreenIntent", hasFullScreenIntentPermission());
        result.put("batteryOptimization", isIgnoringBatteryOptimizations());
        result.put("overlay", hasOverlayPermission());
        call.resolve(result);
    }

    private boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private boolean hasExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am =
                    (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            return am != null && am.canScheduleExactAlarms();
        }
        return true;
    }

    private boolean hasFullScreenIntentPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            NotificationManager nm = (NotificationManager)
                    getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            return nm != null && nm.canUseFullScreenIntent();
        }
        return true;
    }

    private boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                return Settings.canDrawOverlays(getContext());
            } catch (Exception e) {
                return false;
            }
        }
        return true;
    }

    private boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm =
                    (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            return pm != null
                    && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        return true;
    }
}