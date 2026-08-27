package com.medsync.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Full-screen ringing alarm — indistinguishable from the system Clock app.
 *
 * Launched at the exact medication time — directly by AlarmReceiver when
 * possible, otherwise automatically via the receiver's full-screen intent.
 * The user never taps a notification and never opens the app manually.
 * The activity:
 *   - wakes the device and turns the screen on
 *   - shows over the lock screen and dismisses the keyguard
 *   - plays the alarm sound continuously (USAGE_ALARM stream)
 *   - vibrates continuously
 *   - keeps ringing until the user chooses:
 *       ✅ Take Medicine   ⏰ Snooze 5/10 min   ❌ Dismiss
 *
 * Every action is reported back to the web layer via the MedSyncAlarm
 * plugin ("alarmAction" event) so medication history stays in sync.
 */
public class AlarmFullscreenActivity extends Activity {

    private static final long WAKELOCK_TIMEOUT_MS = 15 * 60 * 1000L; // matches service cap

    private PowerManager.WakeLock wakeLock;
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable clockUpdater;

    private String medicineId;
    private String medicineName;
    private String dosage;
    private String instructions;
    private String scheduledTime;
    private int requestCode;
    private boolean alarmSound = true;
    private boolean alarmVibrate = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ===== Lock-screen behavior (native alarm-clock style) =====
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // Modern API: show over lock screen + turn screen on.
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            // Legacy flags for Android 7.x and below.
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_alarm);

        // The receiver posted a full-screen-intent notification as the
        // delivery vehicle. We're now on screen, so remove it immediately —
        // the user never sees or interacts with any notification.
        cancelFullScreenIntentNotification();

        readIntentExtras();
        bindViews();

        acquireWakeLock();
        startClock();
        if (alarmSound) playRingtone();
        if (alarmVibrate) startVibrate();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // A new alarm fired while this one was already on screen:
        // refresh the details and keep ringing.
        cancelFullScreenIntentNotification();
        setIntent(intent);
        readIntentExtras();
        bindViews();
    }

    /** Remove the full-screen-intent notification posted by AlarmReceiver. */
    private void cancelFullScreenIntentNotification() {
        try {
            NotificationManager nm =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(3001); // AlarmReceiver.FSI_NOTIFICATION_ID
        } catch (Exception ignored) {
        }
    }

    // ===== UI =============================================================

    private void readIntentExtras() {
        Intent intent = getIntent();
        medicineId = intent.getStringExtra("medicine_id");
        medicineName = intent.getStringExtra("medicine_name");
        dosage = intent.getStringExtra("dosage");
        instructions = intent.getStringExtra("instructions");
        scheduledTime = intent.getStringExtra("time");
        requestCode = intent.getIntExtra("request_code", -1);
        alarmSound = intent.getBooleanExtra("alarm_sound", true);
        alarmVibrate = intent.getBooleanExtra("alarm_vibrate", true);

        if (medicineName == null || medicineName.isEmpty()) medicineName = "Medication";
        if (dosage == null) dosage = "";
        if (instructions == null) instructions = "";
        if (scheduledTime == null) scheduledTime = "";
    }

    private void bindViews() {
        TextView nameText = findViewById(R.id.medicine_name);
        TextView dosageText = findViewById(R.id.dosage);
        TextView instructionsText = findViewById(R.id.instructions);
        TextView scheduledText = findViewById(R.id.scheduled_time);
        Button takeButton = findViewById(R.id.take_button);
        Button snooze5Button = findViewById(R.id.snooze5_button);
        Button snooze10Button = findViewById(R.id.snooze10_button);
        Button dismissButton = findViewById(R.id.dismiss_button);

        nameText.setText(medicineName);
        if (dosage.isEmpty()) {
            dosageText.setVisibility(View.GONE);
        } else {
            dosageText.setText(dosage);
            dosageText.setVisibility(View.VISIBLE);
        }
        if (instructions.isEmpty()) {
            instructionsText.setVisibility(View.GONE);
        } else {
            instructionsText.setText(instructions);
            instructionsText.setVisibility(View.VISIBLE);
        }

        String formatted = formatTime(scheduledTime);
        scheduledText.setText(formatted.isEmpty()
                ? "Scheduled medication time"
                : "Scheduled for " + formatted);

        takeButton.setOnClickListener(v -> completeAlarm("taken"));
        snooze5Button.setOnClickListener(v -> snooze(5));
        snooze10Button.setOnClickListener(v -> snooze(10));
        dismissButton.setOnClickListener(v -> completeAlarm("dismissed"));
    }

    private void startClock() {
        TextView clockText = findViewById(R.id.current_time);
        TextView dateText = findViewById(R.id.current_date);

        if (clockUpdater != null) handler.removeCallbacks(clockUpdater);
        clockUpdater = new Runnable() {
            @Override
            public void run() {
                Calendar now = Calendar.getInstance();
                Date d = now.getTime();
                SimpleDateFormat timeFmt = new SimpleDateFormat("h:mm", Locale.getDefault());
                SimpleDateFormat ampmFmt = new SimpleDateFormat("a", Locale.getDefault());
                SimpleDateFormat dateFmt =
                        new SimpleDateFormat("EEEE, MMMM d", Locale.getDefault());
                clockText.setText(timeFmt.format(d));
                ((TextView) findViewById(R.id.am_pm)).setText(ampmFmt.format(d));
                dateText.setText(dateFmt.format(d));
                handler.postDelayed(this, 1000);
            }
        };
        clockUpdater.run();
    }

    private String formatTime(String time) {
        try {
            SimpleDateFormat in = new SimpleDateFormat("HH:mm", Locale.getDefault());
            SimpleDateFormat out = new SimpleDateFormat("h:mm a", Locale.getDefault());
            Date date = in.parse(time);
            return out.format(date);
        } catch (Exception e) {
            return time == null ? "" : time;
        }
    }

    // ===== Ringing ========================================================

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        @SuppressWarnings("deprecation")
        PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                        | PowerManager.ACQUIRE_CAUSES_WAKEUP
                        | PowerManager.ON_AFTER_RELEASE,
                "MedSync::AlarmRingingWakeLock"
        );
        wakeLock = wl;
        wakeLock.acquire(WAKELOCK_TIMEOUT_MS);
    }

    private void playRingtone() {
        stopMediaPlayer();
        requestAudioFocus();
        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) {
                uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, uri);
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            mediaPlayer.setLooping(true);
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                restoreAudioAfterError();
                return true;
            });
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            // Visual alarm still works even if audio fails.
        }
    }

    /** If playback is interrupted (e.g. another app grabs audio), restart it. */
    private void restoreAudioAfterError() {
        handler.postDelayed(() -> {
            if (!isFinishing() && !isDestroyed()) {
                if (alarmSound) playRingtone();
            }
        }, 1000);
    }

    private void startVibrate() {
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        long[] pattern = {0, 800, 400, 800, 400}; // ring-pause-ring-pause...
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else {
            vibrator.vibrate(pattern, 0);
        }
    }

    private void stopMediaPlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
            } catch (Exception ignored) {
            }
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {
            }
            mediaPlayer = null;
        }
        abandonAudioFocus();
    }

    private void requestAudioFocus() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                    .setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build())
                    .build();
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
            audioFocusRequest = null;
        }
    }

    // ===== User actions ===================================================

    /** Take Medicine or Dismiss. */
    private void completeAlarm(String action) {
        emitAction(action);
        finishAndCleanup();
    }

    /** Snooze: stop ringing now, schedule an exact alarm N minutes out. */
    private void snooze(int minutes) {
        Calendar snoozeAt = Calendar.getInstance();
        snoozeAt.add(Calendar.MINUTE, minutes);
        long triggerAt = snoozeAt.getTimeInMillis();

        int snoozeCode = AlarmScheduler.generateRequestCode(
                medicineId != null ? medicineId : "snooze",
                "snooze-" + triggerAt
        );

        AlarmScheduler.scheduleAlarmAt(
                this,
                medicineId != null ? medicineId : "snooze",
                medicineName,
                dosage,
                instructions,
                scheduledTime,
                snoozeCode,
                triggerAt,
                alarmSound,
                alarmVibrate
        );

        emitAction("snoozed:" + minutes);
        finishAndCleanup();
    }

    /** Report the user's choice to the web layer (medication history). */
    private void emitAction(String action) {
        AlarmPlugin.emitAlarmAction(action, medicineId, medicineName, dosage, scheduledTime);
    }

    private void finishAndCleanup() {
        stopRinging();
        stopForegroundService();
        finish();
    }

    private void stopRinging() {
        stopMediaPlayer();
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }
        if (clockUpdater != null) {
            handler.removeCallbacks(clockUpdater);
            clockUpdater = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
    }

    private void stopForegroundService() {
        try {
            stopService(new Intent(this, AlarmService.class));
        } catch (Exception ignored) {
        }
    }

    // ===== Lifecycle ======================================================

    @Override
    protected void onDestroy() {
        stopRinging();
        stopForegroundService();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // Prevent accidental dismissal — the user MUST choose
        // Take Medicine / Snooze / Dismiss, exactly like the Clock app.
    }
}