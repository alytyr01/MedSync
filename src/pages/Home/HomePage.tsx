import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Users,
  User,
  Phone,
  Check,
  ChevronRight,
  CalendarDays,
  ScanLine,
} from 'lucide-react';
import { useMedicines } from '@/hooks/useMedicines';
import {
  useTodayLogs,
  useLogMedicationAction,
} from '@/hooks/useMedicationLogs';
import { useEmergencyContacts } from '@/hooks/useContacts';
import { snoozeReminder, cancelReminder } from '@/services/notifications';
import { LoadingState, ErrorState, Badge, Button } from '@/components/common';
import { ReminderItem } from '@/components/medicine/ReminderItem';
import { formatFullDate, getTodayISO } from '@/utils/format';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

export function HomePage() {
  const navigate = useNavigate();
  const { data: medicines, isLoading, error, refetch } = useMedicines();
  const { data: todayLogs } = useTodayLogs();
  const { data: contacts } = useEmergencyContacts();
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

  const primaryContact = (contacts ?? []).find((c) => c.is_primary);

  if (isLoading) {
    return (
      <div className="px-3 pt-8">
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
      <div className="px-3 pt-8">
        <ErrorState
          message="Failed to load your dashboard"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      {/* ===== Compact Header — Premium ===== */}
      <header className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] leading-[16px] text-text-secondary mb-0.5">
              {formatFullDate(new Date())}
            </p>
            <h1 className="text-[22px] font-bold text-text tracking-tight leading-tight">
              {getGreeting()}, Anessa
            </h1>
          </div>
          {/* Icon buttons are offset so their centers align with the
              date text line ("Friday, August 21, 2026") */}
          <div className="flex items-center gap-2 ml-auto shrink-0 self-start -mt-2.5">
            <button
              type="button"
              className="w-9 h-9 bg-surface-muted rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="w-9 h-9 bg-surface-muted rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors"
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
                  Good Morning!
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
                    You're all caught up for now!
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

      {/* ===== Upcoming ===== */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="section-title">Upcoming</h2>
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
            <div className="w-9 h-9 bg-mint-soft flex items-center justify-center mx-auto mb-2">
              <Check className="w-4 h-4 text-mint-deep" strokeWidth={2} />
            </div>
            <p className="text-sm text-text-secondary">
              No upcoming reminders today.
            </p>
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

      {/* ===== Caregiver ===== */}
      <section className="mb-4">
        <h2 className="section-title mb-2.5">Caregiver</h2>
        {primaryContact ? (
          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-pastel-blue/60 flex items-center justify-center shrink-0">
                <span className="text-blue-deep font-semibold text-[16px]">
                  {primaryContact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-text text-[15px]">
                    {primaryContact.name}
                  </h3>
                  <Badge variant="success" dot>
                    Available
                  </Badge>
                </div>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  {primaryContact.relationship} ·{' '}
                  {formatPhone(primaryContact.phone)}
                </p>
              </div>
              <button
                onClick={() =>
                  (window.location.href = `tel:${primaryContact.phone.replace(
                    /[^+\d]/g,
                    ''
                  )}`)
                }
                className="w-10 h-10 bg-primary text-white flex items-center justify-center hover:bg-primary-light transition-colors shrink-0 ml-2"
                aria-label={`Call ${primaryContact.name}`}
              >
                <Phone className="w-[17px] h-[17px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : (
          <div className="premium-card p-4 text-center">
            <div className="w-9 h-9 bg-surface-muted flex items-center justify-center mx-auto mb-3">
              <Users className="w-4 h-4 text-text-tertiary" strokeWidth={2} />
            </div>
            <h3 className="text-[14px] font-medium text-text tracking-tight mb-1">
              No caregiver assigned
            </h3>
            <p className="text-[13px] text-text-secondary mb-4 max-w-xs mx-auto leading-relaxed">
              Add an emergency contact to have a caregiver status on your
              dashboard.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/contacts')}
              className="min-h-[40px] px-6"
            >
              Add Emergency Contact
            </Button>
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