import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiClock,
  FiActivity,
  FiPackage,
  FiUsers,
  FiBarChart,
  FiPhone,
  FiPlus,
} from 'react-icons/fi';
import { useMedicines } from '@/hooks/useMedicines';
import {
  useTodayLogs,
  useLogMedicationAction,
  useMedicationLogs,
} from '@/hooks/useMedicationLogs';
import { useLowStockInventory } from '@/hooks/useInventory';
import { useEmergencyContacts } from '@/hooks/useContacts';
import {
  Card,
  LoadingState,
  ErrorState,
  Badge,
  Button,
} from '@/components/common';
import { ReminderItem } from '@/components/medicine/ReminderItem';
import { MedicineCard } from '@/components/medicine/MedicineCard';
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
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const },
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
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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

  const CIRCLE_R = 33;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
  const circleOffset = CIRCUMFERENCE * (1 - progress / 100);

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
      <div className="px-5 pt-8">
        <div className="space-y-2 mb-6">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-7 w-48" />
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
      className="px-5 pb-24"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ===== Clean Header ===== */}
      <motion.header variants={item} className="pt-8 pb-6">
        <p className="text-[13px] text-secondary">
          {formatFullDate(new Date())}
        </p>
        <div className="mt-1">
          <h1 className="text-[28px] font-bold text-text tracking-tight leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-sm text-secondary mt-0.5">
            {totalCount > 0
              ? `${totalCount - takenCount} doses remaining today`
              : 'No medications scheduled today'}
          </p>
        </div>
      </motion.header>

      {/* ===== Hero Card — Today's Progress ===== */}
      <motion.div variants={item} className="mb-7">
        <Card className="border-primary/10" padding="lg">
          <div className="flex items-center gap-5">
            <div className="relative w-[84px] h-[84px] shrink-0">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle
                  cx="42"
                  cy="42"
                  r={CIRCLE_R}
                  fill="none"
                  stroke="rgba(15, 118, 110, 0.08)"
                  strokeWidth="5"
                />
                <motion.circle
                  cx="42"
                  cy="42"
                  r={CIRCLE_R}
                  fill="none"
                  stroke="url(#gradient-primary)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  initial={{ strokeDashoffset: CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: circleOffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0F766E" />
                    <stop offset="100%" stopColor="#14B8A6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-bold text-text leading-none">
                  {progress}%
                </span>
                <span className="text-[10px] text-secondary mt-0.5">taken</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-secondary">
                Today's adherence
              </p>
              <h2 className="text-[22px] font-bold text-text tracking-tight mt-0.5">
                {takenCount}{' '}
                <span className="text-secondary font-medium text-base">
                  of {totalCount} doses
                </span>
              </h2>
              {nextReminder ? (
                <div className="mt-3 flex items-center gap-2 bg-surface-muted rounded-full px-3 py-1.5">
                  <FiClock className="w-3.5 h-3.5 text-text-secondary" />
                  <span className="text-[13px] font-medium text-text">
                    {formatTime(nextReminder.time)}
                  </span>
                  <span className="text-text-tertiary text-[13px]">
                    {nextReminder.medicine.name}
                  </span>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 bg-surface-muted rounded-full px-3 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-soft-pulse" />
                  <span className="text-[13px] font-medium text-text">
                    All caught up
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ===== Quick Actions ===== */}
      <motion.section variants={item} className="mb-7">
        <h2 className="section-title mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/medicines')}
            className="premium-card-hover p-4 flex flex-col items-center gap-2 text-center pressable"
          >
            <div className="w-11 h-11 rounded-[14px] bg-primary-soft flex items-center justify-center">
              <FiPlus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[12px] font-medium text-text">Add Medicine</span>
          </button>
          <button
            onClick={() => navigate('/scan')}
            className="premium-card-hover p-4 flex flex-col items-center gap-2 text-center pressable"
          >
            <div className="w-11 h-11 rounded-[14px] bg-primary-soft flex items-center justify-center">
              <FiActivity className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[12px] font-medium text-text">Scan</span>
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="premium-card-hover p-4 flex flex-col items-center gap-2 text-center pressable"
          >
            <div className="w-11 h-11 rounded-[14px] bg-primary-soft flex items-center justify-center">
              <FiPackage className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[12px] font-medium text-text">Inventory</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="premium-card-hover p-4 flex flex-col items-center gap-2 text-center pressable"
          >
            <div className="w-11 h-11 rounded-[14px] bg-primary-soft flex items-center justify-center">
              <FiBarChart className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[12px] font-medium text-text">History</span>
          </button>
        </div>
      </motion.section>

      {/* ===== Statistic Cards (2-up) ===== */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-7">
        <Card interactive padding="md" className="px-5 py-4"
          onClick={() => navigate('/medicines')}>
          <div className="w-9 h-9 rounded-[12px] bg-primary-soft flex items-center justify-center mb-3">
            <FiActivity className="w-[18px] h-[18px] text-primary" />
          </div>
          <p className="text-2xl font-bold text-text tracking-tight leading-none">
            {uniqueMedicines.length}
          </p>
          <p className="text-[13px] text-secondary mt-1">Medications</p>
        </Card>

        <Card interactive padding="md" className="px-5 py-4"
          onClick={() => navigate('/inventory')}>
          <div className="w-9 h-9 rounded-[12px] bg-primary-soft flex items-center justify-center mb-3">
            <FiPackage className="w-[18px] h-[18px] text-primary" />
          </div>
          <p className="text-2xl font-bold text-text tracking-tight leading-none">
            {lowStockItems.length}
          </p>
          <p className="text-[13px] text-secondary mt-1">Need refill</p>
        </Card>
      </motion.div>

      {/* ===== Inventory Alerts ===== */}
      {lowStockItems.length > 0 && (
        <motion.div variants={item} className="mb-7">
          <h2 className="section-title mb-3">Inventory Alerts</h2>
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <Card
                key={item.id}
                className="px-4 py-3.5 border-warning/20"
                padding="none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[10px] bg-warning/10 flex items-center justify-center shrink-0">
                      <FiPackage className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-text text-[15px]">
                        {item.medicines?.name ?? 'Unknown'}
                      </p>
                      <p className="text-[13px] text-secondary mt-0.5">
                        {item.remaining_quantity} remaining
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning" dot>
                    Low stock
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== Upcoming Reminders ===== */}
      <motion.section variants={item} className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Upcoming Doses</h2>
          {upcomingReminders.length > 0 && (
            <button
              onClick={() => navigate('/medicines')}
              className="text-[13px] text-primary font-medium"
            >
              View all
            </button>
          )}
        </div>

        {upcomingReminders.length === 0 ? (
          <Card className="p-6 text-center" padding="none">
            <div className="w-12 h-12 rounded-[14px] bg-success/10 flex items-center justify-center mx-auto mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-soft-pulse" />
            </div>
            <p className="text-sm text-secondary">
              No upcoming reminders for today. All caught up!
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
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

      {/* ===== Today's Medicines ===== */}
      {totalCount > 0 && (
        <motion.section variants={item} className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Today's Medicines</h2>
            <button
              onClick={() => navigate('/medicines')}
              className="text-[13px] text-primary font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {uniqueMedicines.slice(0, 3).map((medicine, index) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                index={index}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* ===== Caregiver Status ===== */}
      <motion.section variants={item} className="mb-7">
        <h2 className="section-title mb-3">Caregiver</h2>
        {primaryContact ? (
          <Card className="p-5" padding="none">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[14px] bg-primary-soft flex items-center justify-center shrink-0">
                <span className="text-primary font-semibold text-[19px]">
                  {primaryContact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text text-[15px]">
                    {primaryContact.name}
                  </h3>
                  <Badge variant="success" dot>
                    Available
                  </Badge>
                </div>
                <p className="text-[13px] text-secondary mt-0.5">
                  {primaryContact.relationship} · {formatPhone(primaryContact.phone)}
                </p>
              </div>
              <button
                onClick={() =>
                  (window.location.href = `tel:${primaryContact.phone.replace(
                    /[^+\d]/g,
                    ''
                  )}`)
                }
                className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors shrink-0 ml-2"
                aria-label={`Call ${primaryContact.name}`}
              >
                <FiPhone className="w-[18px] h-[18px]" />
              </button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center" padding="none">
            <div className="w-14 h-14 rounded-[14px] bg-surface-muted flex items-center justify-center mx-auto mb-3">
              <FiUsers className="w-6 h-6 text-text-tertiary" />
            </div>
            <h3 className="text-[15px] font-semibold text-text tracking-tight mb-1">
              No caregiver assigned
            </h3>
            <p className="text-[13px] text-secondary mb-4 max-w-xs mx-auto leading-relaxed">
              Add an emergency contact to have a caregiver status on your dashboard.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/contacts')}
              className="min-h-[44px] px-6"
            >
              Add Emergency Contact
            </Button>
          </Card>
        )}
      </motion.section>

      {/* ===== Emergency Quick ===== */}
      {primaryContact && (
        <motion.section variants={item} className="mb-7">
          <h2 className="section-title mb-3">Emergency</h2>
          <div className="flex gap-3">
            <button
              onClick={() =>
                (window.location.href = `tel:${primaryContact.phone.replace(
                  /[^+\d]/g,
                  ''
                )}`)
              }
              className="flex-1 premium-card p-4 flex items-center justify-center gap-2 text-primary font-medium pressable"
            >
              <FiPhone className="w-5 h-5" /> Call {primaryContact.name}
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="flex-1 premium-card p-4 flex items-center justify-center gap-2 text-secondary pressable"
            >
              <FiUsers className="w-5 h-5" /> All Contacts
            </button>
          </div>
        </motion.section>
      )}

      {/* ===== Health Insights ===== */}
      <motion.section variants={item} className="mb-7">
        <h2 className="section-title mb-3">This Week</h2>
        <Card className="p-5" padding="none">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-success tracking-tight">
                {takenLogs.length}
              </p>
              <p className="text-[11px] text-secondary mt-0.5 uppercase tracking-wider">
                Taken
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary tracking-tight">
                {progress}%
              </p>
              <p className="text-[11px] text-secondary mt-0.5 uppercase tracking-wider">
                Adherence
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text tracking-tight">
                {lastTakenTime ? getRelativeTime(lastTakenTime) : '—'}
              </p>
              <p className="text-[11px] text-secondary mt-0.5 uppercase tracking-wider">
                Last dose
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}


