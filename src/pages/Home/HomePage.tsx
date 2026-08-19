import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiCamera,
  FiChevronRight,
  FiClock,
  FiAlertCircle,
  FiActivity,
  FiPackage,
} from 'react-icons/fi';
import { useMedicines } from '@/hooks/useMedicines';
import { useTodayLogs, useLogMedicationAction } from '@/hooks/useMedicationLogs';
import { useLowStockInventory } from '@/hooks/useInventory';
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/common';
import { ReminderItem } from '@/components/medicine/ReminderItem';
import { MedicineCard } from '@/components/medicine/MedicineCard';
import {
  formatFullDate,
  formatTime,
  getProgressPercentage,
  getTodayISO,
} from '@/utils/format';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const navigate = useNavigate();
  const { data: medicines, isLoading, error, refetch } = useMedicines();
  const { data: todayLogs } = useTodayLogs();
  const { data: lowStock } = useLowStockInventory();
  const logAction = useLogMedicationAction();

  const today = getTodayISO();

  // Build today's reminders from medicines
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

  const upcomingReminders = todayReminders.filter(
    (r) => r.time >= currentTime
  );

  // Find next reminder
  const nextReminder = upcomingReminders[0];

  // Calculate daily progress
  const takenCount = (todayLogs ?? []).filter(
    (log) => log.status === 'taken'
  ).length;
  const totalCount = todayReminders.length;
  const progress = getProgressPercentage(takenCount, totalCount);

  // Circular progress geometry
  const CIRCLE_R = 33;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
  const circleOffset = CIRCUMFERENCE * (1 - progress / 100);

  const uniqueMedicines = Array.from(
    new Map(
      todayReminders.map((r) => [r.medicine.id, r.medicine])
    ).values()
  );

  const handleTaken = (medicineId: string, time: string) => {
    const scheduledTime = `${today}T${time}:00`;
    logAction.mutate({
      medicineId,
      scheduledTime,
      status: 'taken',
    });
  };

  const handleSkip = (medicineId: string, time: string) => {
    const scheduledTime = `${today}T${time}:00`;
    logAction.mutate({
      medicineId,
      scheduledTime,
      status: 'skipped',
      skippedReason: 'User skipped',
    });
  };

  const handleSnooze = (medicineId: string, time: string) => {
    const scheduledTime = `${today}T${time}:00`;
    logAction.mutate({
      medicineId,
      scheduledTime,
      status: 'snoozed',
    });
  };

  if (isLoading) {
    return (
      <div className="px-5 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-7 w-48" />
          </div>
          <div className="skeleton h-10 w-10 rounded-full" />
        </div>
        <LoadingState variant="cards" label="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 pt-8">
        <ErrorState
          message="Failed to load your dashboard"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="px-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ===== Header ===== */}
      <motion.header variants={item} className="pt-8 pb-6">
        <p className="text-[13px] text-secondary">{formatFullDate(new Date())}</p>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-[28px] font-bold text-text tracking-tight leading-tight">
              {getGreeting()}
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              {totalCount > 0
                ? `${totalCount - takenCount} doses remaining today`
                : 'No medications scheduled today'}
            </p>
          </div>
          <button
            onClick={() => navigate('/scan')}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark active:scale-95 transition-all duration-200 shadow-[0_2px_10px_rgba(46,122,88,0.25)]"
            aria-label="Scan prescription"
          >
            <FiCamera className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* ===== Hero Card — Today's Progress ===== */}
      <motion.div variants={item} className="mb-4">
        <Card
          className="p-6 bg-primary-deep border-primary-deep shadow-[0_8px_28px_rgba(20,69,47,0.25)]"
          padding="lg"
        >
          <div className="flex items-center gap-5">
            {/* Circular Progress */}
            <div className="relative w-[84px] h-[84px] shrink-0">
              <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
                <circle
                  cx="42"
                  cy="42"
                  r={CIRCLE_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="5"
                />
                <motion.circle
                  cx="42"
                  cy="42"
                  r={CIRCLE_R}
                  fill="none"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  initial={{ strokeDashoffset: CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: circleOffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-bold text-white leading-none">
                  {progress}%
                </span>
                <span className="text-[10px] text-white/60 mt-0.5">
                  taken
                </span>
              </div>
            </div>

            {/* Progress info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white/70 font-medium">
                Today's progress
              </p>
              <h2 className="text-[22px] font-bold text-white tracking-tight mt-0.5">
                {takenCount}
                <span className="text-white/60 font-medium text-base">
                  {' '}of {totalCount} doses
                </span>
              </h2>
              {nextReminder ? (
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                    <FiClock className="w-3.5 h-3.5 text-white/70" />
                    <span className="text-[13px] font-semibold text-white">
                      {formatTime(nextReminder.time)}
                    </span>
                    <span className="text-white/60 text-[13px]">
                      {nextReminder.medicine.name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                    <FiCheckCircleMini className="w-3.5 h-3.5 text-white/70" />
                    <span className="text-[13px] font-medium text-white/90">
                      All caught up
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick action */}
          <button
            onClick={() => navigate('/scan')}
            className="w-full mt-5 bg-white/10 hover:bg-white/15 rounded-button py-3 flex items-center justify-center gap-2 text-white text-sm font-medium transition-colors duration-200 active:scale-[0.98]"
          >
            <FiCamera className="w-4 h-4" />
            Scan a new prescription
          </button>
        </Card>
      </motion.div>

      {/* ===== Small Statistic Cards (2-up) ===== */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-4">
        <Card interactive padding="md" className="p-4" onClick={() => navigate('/medicines')}>
          <div className="w-9 h-9 rounded-[12px] bg-primary-soft flex items-center justify-center mb-3">
            <FiActivity className="w-[18px] h-[18px] text-primary" />
          </div>
          <p className="text-2xl font-bold text-text tracking-tight leading-none">
            {uniqueMedicines.length}
          </p>
          <p className="text-[13px] text-secondary mt-1">Medications</p>
        </Card>

        <Card interactive padding="md" className="p-4" onClick={() => navigate('/inventory')}>
          <div className="w-9 h-9 rounded-[12px] bg-warning/10 flex items-center justify-center mb-3">
            <FiPackage className="w-[18px] h-[18px] text-warning" />
          </div>
          <p className="text-2xl font-bold text-text tracking-tight leading-none">
            {lowStock?.length ?? 0}
          </p>
          <p className="text-[13px] text-secondary mt-1">Need refill</p>
        </Card>
      </motion.div>

      {/* ===== Low Stock Alert ===== */}
      {lowStock && lowStock.length > 0 && (
        <motion.div variants={item}>
          <Card className="p-4 mb-4 bg-warning/5 border-warning/25" padding="md">
            <button
              onClick={() => navigate('/inventory')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <FiAlertCircle className="w-4 h-4 text-warning" />
                </div>
                <div className="text-left">
                  <h3 className="text-[15px] font-semibold text-text">
                    Inventory running low
                  </h3>
                  <p className="text-[13px] text-secondary mt-0.5">
                    {lowStock.length} medicine
                    {lowStock.length > 1 ? 's' : ''} need refill soon
                  </p>
                </div>
              </div>
              <FiChevronRight className="w-4 h-4 text-warning shrink-0" />
            </button>
          </Card>
        </motion.div>
      )}

      {/* ===== Upcoming Reminders Section ===== */}
      <motion.section variants={item} className="mb-7">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[17px] font-semibold text-text tracking-tight">
            Up next
          </h2>
          {upcomingReminders.length > 0 && (
            <span className="text-xs text-secondary">
              {upcomingReminders.length} remaining
            </span>
          )}
        </div>

        {upcomingReminders.length === 0 ? (
          <EmptyState
            title="All caught up!"
            description="No upcoming reminders for today. Great job staying on track!"
          />
        ) : (
          <div className="space-y-3">
            {upcomingReminders.slice(0, 3).map((reminder, index) => (
              <ReminderItem
                key={reminder.key}
                medicine={reminder.medicine}
                time={reminder.time}
                onTaken={() => handleTaken(reminder.medicine.id, reminder.time)}
                onSkip={() => handleSkip(reminder.medicine.id, reminder.time)}
                onSnooze={() =>
                  handleSnooze(reminder.medicine.id, reminder.time)
                }
                index={index}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* ===== Today's Medicines ===== */}
      <motion.section variants={item} className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[17px] font-semibold text-text tracking-tight">
            Today's medicines
          </h2>
          {todayReminders.length > 0 && (
            <button
              onClick={() => navigate('/medicines')}
              className="text-[13px] text-primary font-medium"
            >
              View all
            </button>
          )}
        </div>

        {totalCount === 0 ? (
          <EmptyState
            title="No medicines yet"
            description="Scan a prescription or add medicines manually to get started."
            action={
              <button
                onClick={() => navigate('/medicines')}
                className="text-sm text-primary font-medium"
              >
                Add Medicines
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {uniqueMedicines.slice(0, 3).map((medicine, index) => (
              <MedicineCard key={medicine.id} medicine={medicine} index={index} />
            ))}
            {uniqueMedicines.length > 3 && (
              <button
                onClick={() => navigate('/medicines')}
                className="w-full py-3 text-[13px] text-secondary font-medium rounded-button hover:bg-surface-muted transition-colors"
              >
                + {uniqueMedicines.length - 3} more medicines
              </button>
            )}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

// Small inline icon used in the hero card
function FiCheckCircleMini({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}