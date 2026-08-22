# MedSync Alarm Implementation Task

## User's Immediate Issue
When an alarm triggers, only a notification icon appears. Clicking the notification opens the full-screen alarm. The user wants the full-screen alarm to appear DIRECTLY when the alarm triggers.

## Goal
Native Android medicine alarm system (like Android Clock app):
- Alarm triggers exactly on time even when app closed/locked/screen off/Doze/restarted
- No JS timers
- Native: AlarmManager, BroadcastReceiver, PendingIntent, NotificationManager, Full-Screen Intent, MediaPlayer, WakeLock, BootReceiver
- Full-screen alarm UI (medicine name, dosage, time, instructions) with Taken/Snooze/Skip
- High-priority notification with actions
- Configurable snooze (5/10/15/custom)
- Recurring reminders
- BootReceiver restores alarms

## Environment
- Windows 10, cmd.exe
- Cross-platform app: React (TypeScript) + Capacitor + Android (Java native)
- Note: Existing native code is Java, not Kotlin