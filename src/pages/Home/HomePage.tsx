import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Clock,
  Package,
  Users,
  User,
  Phone,
  Check,
  Pill,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { useMedicines } from '@/hooks/useMedicines';
import {
  useTodayLogs,
  useLogMedicationAction,
  useMedicationLogs,
} from '@/hooks/useMedicationLogs';
import { useLowStockInventory } from '@/hooks/useInventory';
import { useEmergencyContacts } from '@/hooks/useContacts';
import { LoadingState, ErrorState, Badge, Button } from '@/components/common';
import { ReminderItem } from '@/components/medicine/ReminderItem';
import {
  formatFullDate,
  formatTime,
  getProgressPercentage,
  getRelativeTime,
  getTodayISO,
  addDays,
} from '@/utils/format';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  },
};

interface InventoryWithMedicine {
  id: string;
  medicine_id: string;
  total_quantity: number;
  remaining_quantity: number;
  low_stock_threshold: number;
  refill_reminder: boolean;
  last_refilled_at: string | null;
  medicines?: { name: string; dosage: string } | null;
}

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
  const { data: lowStock } = useLowStockInventory();
  const { data: contacts } = useEmergencyContacts();
  const { data: recentLogs } = useMedicationLogs(
    addDays(getTodayISO(), -7),
    getTodayISO()
  );
  const logAction = useLogMedicationAction();

  const today = getTodayISO();

  const todayReminders = (medicines ?? []).flatMap((medicine) =>
    medicine.schedule_times.map((time) => ({
      medicine,
      time,
      key: `${medicine.id}-${time}`,
    }))
  );

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const upcomingReminders = todayReminders.filter((r) => r.time >= currentTime);
  const nextReminder = upcomingReminders[0];

  const takenCount = (todayLogs ?? []).filter(
    (log) => log.status === 'taken'
  ).length;
  const totalCount = todayReminders.length;
  const progress = getProgressPercentage(takenCount, totalCount);

  const uniqueMedicines = Array.from(
    new Map(
      todayReminders.map((r) => [r.medicine.id, r.medicine])
    ).values()
  );

  const handleTaken = (medicineId: string, time: string) => {
    logAction.mutate({
      medicineId,
      scheduledTime: `${today}T${time}:00`,
      status: 'taken',
    });
  };

  const handleSkip = (medicineId: string, time: string) => {
    logAction.mutate({
      medicineId,
      scheduledTime: `${today}T${time}:00`,
      status: 'skipped',
      skippedReason: 'User skipped',
    });
  };

  const handleSnooze = (medicineId: string, time: string) => {
    logAction.mutate({
      medicineId,
      scheduledTime: `${today}T${time}:00`,
      status: 'snoozed',
    });
  };

  const primaryContact = (contacts ?? []).find((c) => c.is_primary);

  const takenLogs = (recentLogs ?? []).filter(
    (log) => log.status === 'taken' && log.taken_at
  );
  const lastTakenTime =
    takenLogs.length > 0
      ? takenLogs.reduce((latest, log) =>
          log.taken_at && (!latest || log.taken_at > latest)
            ? log.taken_at
            : latest
        , '')
      : null;

  const lowStockItems = (lowStock ?? []) as InventoryWithMedicine[];

  if (isLoading) {
    return (
      <div className="px-6 pt-8">
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
      <div className="px-6 pt-8">
        <ErrorState
          message="Failed to load your dashboard"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="px-5 pb-2"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ===== Compact Header — Premium ===== */}
      <motion.header variants={item} className="pt-7 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-caption text-text-secondary mb-1">
              {formatFullDate(new Date())}
            </p>
            <h1 className="text-3xl font-bold text-text tracking-tight leading-snug">
              {getGreeting()}, Anessa
            </h1>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors"
              aria-label="Profile"
            >
              <User className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* ===== Reminder Companion Card — always shown ===== */}
      <motion.div variants={item} className="mb-4">
        <div className="premium-card overflow-hidden">
          <div className="px-5 pt-5 pb-5">
            {/* Avatar + Chat bubble */}
            <div className="flex items-start gap-3">
              {/* Companion avatar image */}
              <div className="w-20 h-20 shrink-0 bg-pastel-mint/60 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/images/hero-image.png"
                  alt="Reminder companion"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Chat bubble */}
              <div className="flex-1 min-w-0">
                <div className="bg-primary-soft rounded-[18px] rounded-tl-[6px] px-4 py-3">
                  <p className="eyebrow mb-1">Good Morning!</p>
                  {nextReminder ? (
                    <p className="text-[15px] font-semibold text-text leading-snug">
                      Time to take your{' '}
                      <span className="text-primary">{nextReminder.medicine.name}</span>{' '}
                      {nextReminder.medicine.dosage}
                    </p>
                  ) : (
                    <p className="text-[15px] font-semibold text-text leading-snug">
                      You're all caught up for now!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduled info */}
            <div className="mt-4 flex items-center gap-2 text-text-secondary">
              <Clock className="w-4 h-4" strokeWidth={2} />
              {nextReminder ? (
                <>
                  <span className="text-[13px] font-medium">
                    Scheduled ·{' '}
                    <span className="font-semibold text-text">
                      {formatTime(nextReminder.time)}
                    </span>
                  </span>
                  <span className="text-xs text-text-tertiary ml-auto">
                    {upcomingReminders.length} remaining today
                  </span>
                </>
              ) : (
                <span className="text-[13px] font-medium">
                  No medications scheduled right now
                </span>
              )}
            </div>

            {/* Mark as Taken */}
            {nextReminder && (
              <Button
                onClick={() =>
                  handleTaken(nextReminder.medicine.id, nextReminder.time)
                }
                size="md"
                fullWidth
                className="mt-4"
              >
                <Check className="w-5 h-5" strokeWidth={2.2} />
                Mark as Taken
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== Compact Progress ===== */}
      <motion.div variants={item} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption font-medium text-text-secondary">
            Daily progress
          </span>
          <span className="text-[12px] font-semibold text-text">
            {takenCount}/{totalCount}
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>

      {/* ===== Quick stats — premium single card ===== */}
      <motion.div variants={item} className="mb-6">
        <div className="premium-card overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Medications */}
            <button
              type="button"
              onClick={() => navigate('/medicines')}
              className="group relative p-5 text-left transition-colors hover:bg-surface-muted/60 active:bg-surface-muted"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-[14px] bg-pastel-mint flex items-center justify-center shadow-sm">
                  <Pill className="w-[18px] h-[18px] text-mint-deep" strokeWidth={2.2} />
                </div>
                <ChevronRight
                  className="w-4 h-4 text-text-tertiary transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </div>
              <p className="text-[28px] font-bold text-text tracking-tight leading-none">
                {uniqueMedicines.length}
              </p>
              <p className="text-[12px] font-medium text-text-secondary mt-1.5">
                Medications
              </p>
            </button>

            {/* Need refill */}
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="group relative p-5 text-left transition-colors hover:bg-surface-muted/60 active:bg-surface-muted"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-[14px] bg-pastel-blue flex items-center justify-center shadow-sm">
                  <Package className="w-[18px] h-[18px] text-blue-deep" strokeWidth={2.2} />
                </div>
                <ChevronRight
                  className="w-4 h-4 text-text-tertiary transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </div>
              <p className="text-[28px] font-bold text-text tracking-tight leading-none">
                {lowStockItems.length}
              </p>
              <p className="text-[12px] font-medium text-text-secondary mt-1.5">
                Need refill
              </p>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ===== Upcoming ===== */}
      <motion.section variants={item} className="mb-5">
        <div className="flex items-center justify-between mb-3">
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
          <div className="premium-card p-5 text-center">
            <div className="w-9 h-9 bg-mint-soft flex items-center justify-center mx-auto mb-2">
              <Check className="w-4 h-4 text-mint-deep" strokeWidth={2} />
            </div>
            <p className="text-sm text-text-secondary">
              No upcoming reminders today.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingReminders.slice(0, 4).map((reminder, index) => (
              <ReminderItem
                key={reminder.key}
                medicine={reminder.medicine}
                time={reminder.time}
                onTaken={() => handleTaken(reminder.medicine.id, reminder.time)}
                onSkip={() => handleSkip(reminder.medicine.id, reminder.time)}
                onSnooze={() => handleSnooze(reminder.medicine.id, reminder.time)}
                index={index}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* ===== This Week ===== */}
      <motion.section variants={item} className="mb-6">
        <h2 className="section-title mb-3">This Week</h2>
        <div className="premium-card p-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[24px] font-semibold text-text tracking-tight">
                {takenLogs.length}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">Doses taken</p>
            </div>
            <div>
              <p className="text-[24px] font-semibold text-text tracking-tight">
                {progress}%
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">Adherence</p>
            </div>
            <div>
              <p className="text-[24px] font-semibold text-text tracking-tight">
                {lastTakenTime ? getRelativeTime(lastTakenTime) : '—'}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">Last dose</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ===== Caregiver ===== */}
      <motion.section variants={item} className="mb-6">
        <h2 className="section-title mb-3">Caregiver</h2>
        {primaryContact ? (
          <div className="premium-card p-5">
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
          <div className="premium-card p-6 text-center">
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
      </motion.section>

      {/* ===== Calendar teaser ===== */}
      <motion.section variants={item} className="mb-0">
        <div className="premium-card-hover p-5 cursor-pointer" onClick={() => navigate('/history')}>
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
      </motion.section>
    </motion.div>
  );
}