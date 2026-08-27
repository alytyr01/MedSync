import { useNavigate } from 'react-router-dom';
import {
  Bell,
  User,
  ChevronRight,
  CalendarDays,
  ScanLine,
  BriefcaseMedical,
} from 'lucide-react';
import { useMedicines } from '@/hooks/useMedicines';
import {
  useTodayLogs,
  useLogMedicationAction,
} from '@/hooks/useMedicationLogs';
import { snoozeReminder, cancelReminder } from '@/services/notifications';
import { LoadingState, ErrorState, Button } from '@/components/common';
import { ReminderItem } from '@/components/medicine/ReminderItem';
import { getTodayISO } from '@/utils/format';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function HomePage() {
  const navigate = useNavigate();
  const { data: medicines, isLoading, error, refetch } = useMedicines();
  const { data: todayLogs } = useTodayLogs();
  const logAction = useLogMedicationAction();

  const today = getTodayISO();

  const todayReminders = (medicines ?? []).flatMap((medicine) =>
    medicine.schedule_times.map((time) => ({
      medicine,
      time,
      key: `${medicine.id}-${time}`,
    }))
  );

  // Build a set of already-logged reminders (medicine_id + time)
  const loggedKeys = new Set(
    (todayLogs ?? []).map(
      (log) => `${log.medicine_id}-${log.scheduled_time.slice(11, 16)}`
    )
  );

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  // Exclude reminders that already have a log entry (taken/skipped/snoozed)
  const upcomingReminders = todayReminders.filter(
    (r) =>
      r.time >= currentTime &&
      !loggedKeys.has(`${r.medicine.id}-${r.time}`)
  );
  const nextReminder = upcomingReminders[0];

  const handleTaken = (medicineId: string, time: string) => {
    // Cancel the native notification for this reminder
    cancelReminder(medicineId, time);
    logAction.mutate({
      medicineId,
      scheduledTime: `${today}T${time}:00`,
      status: 'taken',
    });
  };

  const handleSkip = (medicineId: string, time: string) => {
    // Cancel the native notification for this reminder
    cancelReminder(medicineId, time);
    logAction.mutate({
      medicineId,
      scheduledTime: `${today}T${time}:00`,
      status: 'skipped',
      skippedReason: 'User skipped',
    });
  };

  const handleSnooze = (medicineId: string, time: string) => {
    const medicine = todayReminders.find(
      (r) => r.medicine.id === medicineId && r.time === time
    )?.medicine;
    // Schedule a snoozed native notification (fires again in 10 min)
    if (medicine) {
      snoozeReminder(medicine, time, 10);
    }
    logAction.mutate({
      medicineId,
      scheduledTime: `${today}T${time}:00`,
      status: 'snoozed',
    });
  };

  if (isLoading) {
    return (
      <div className="px-3 pt-8 font-alarm">
        <div className="space-y-2 mb-6">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-8 w-48" />
        </div>
        <LoadingState variant="cards" label="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 pt-8 font-alarm">
        <ErrorState
          message="Failed to load your dashboard"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="px-3 pb-2 font-alarm">
      {/* ===== Compact Header — Premium ===== */}
      <header className="pt-5 pb-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold text-text tracking-tight leading-tight">
              {getGreeting()}, Anessa
            </h1>
          </div>
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text active:scale-95 transition-all bg-surface border border-border shadow-card rounded-xl"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text active:scale-95 transition-all bg-surface border border-border shadow-card rounded-xl"
              aria-label="Profile"
            >
              <User className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* ===== Reminder Companion — premium hero design card ===== */}
      <div className="mb-3">
        <div className="relative rounded-[28px] bg-ink shadow-float ring-1 ring-white/10">
          {/* Decorative layer — clipped to the card so glows don't bleed,
              while the companion image is free to overflow the top */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <div className="absolute -top-24 -right-16 w-56 h-56 rounded-full bg-mint-deep/30 blur-3xl" />
            <div className="absolute -bottom-28 -left-14 w-48 h-48 rounded-full bg-primary/25 blur-3xl" />
            {/* Fine top highlight line */}
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>

          {/* Extra-large gap compensates for the scaled-up image overflow,
              keeping clear visual space between image and bubble */}
          <div className="relative flex items-end gap-12 px-4 pt-5">
            {/* Companion image — flush to the bottom edge, overflowing
                slightly above the card's top edge. Scaled up visually
                without affecting the bubble's size. */}
            <div className="w-28 h-28 shrink-0 relative -ml-4 -mt-7 z-10">
              <img
                src="/images/hero-image.png"
                alt="Reminder companion"
                className="absolute bottom-0 left-0 w-full h-full object-cover object-bottom scale-[1.4] origin-bottom-left"
              />
            </div>

            {/* Chat bubble */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-[22px] rounded-tl-[8px] px-4 py-2.5 shadow-lg">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-teal-300 mb-1.5">
                  Daily Reminder
                </p>
                {nextReminder ? (
                  <p className="text-[13px] font-semibold text-white leading-snug">
                    Time to take your{' '}
                    <span className="font-bold text-teal-300">
                      {nextReminder.medicine.name}{' '}
                      {nextReminder.medicine.dosage}
                    </span>
                  </p>
                ) : (
                  <p className="text-[13px] font-semibold text-white leading-snug">
                    No reminders scheduled for today. Add one to get started!
                  </p>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/scan')}
                    className="inline-flex items-center gap-1.5 bg-teal-500/80 text-white font-semibold rounded-full pl-3 pr-3.5 py-1.5 shadow-[0_2px_8px_rgba(94,234,212,0.15)] hover:bg-teal-500 active:scale-[0.97] transition-all"
                  >
                    <ScanLine className="w-3.5 h-3.5" strokeWidth={2.2} />
                    <span className="text-[11px] tracking-tight">
                      Scan Prescription
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Today's Medicines ===== */}
      <section className="mb-4">
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <h2 className="section-title">Today's Medicines</h2>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          {upcomingReminders.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              className="text-[13px] text-primary font-medium"
            >
              View all
            </button>
          )}
        </div>

        {upcomingReminders.length === 0 ? (
          <div className="premium-card p-4 text-center">
            <BriefcaseMedical
              className="w-6 h-6 text-text-secondary mx-auto mb-2.5"
              strokeWidth={2}
            />
            <p className="text-sm text-text-secondary mb-3">
              No upcoming reminders today.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/medicines?add=1')}
              className="min-h-[40px] px-6"
            >
              Add Reminder
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingReminders.slice(0, 4).map((reminder) => (
              <ReminderItem
                key={reminder.key}
                medicine={reminder.medicine}
                time={reminder.time}
                onTaken={() => handleTaken(reminder.medicine.id, reminder.time)}
                onSkip={() => handleSkip(reminder.medicine.id, reminder.time)}
                onSnooze={() => handleSnooze(reminder.medicine.id, reminder.time)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ===== Calendar teaser ===== */}
      <section className="mb-0">
        <div className="premium-card-hover p-4 cursor-pointer" onClick={() => navigate('/history')}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-soft flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[15px] text-text">
                Reminder Timeline
              </h3>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Review your full schedule
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary" strokeWidth={2} />
          </div>
        </div>
      </section>
    </div>
  );
}