import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Pill, ScanLine, Clock, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useReminderScheduler } from '@/hooks/useReminderScheduler';
import { useReminderAlarm } from '@/hooks/useReminderAlarm';
import { ReminderAlarm } from '@/components/reminder/ReminderAlarm';
import { useLogMedicationAction } from '@/hooks/useMedicationLogs';
import { useReminderAlarmStore } from '@/store/reminderAlarmStore';
import { cancelReminder, snoozeReminder } from '@/services/notifications';
import { getTodayISO } from '@/utils/format';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

// Main nav items (without Scan — it gets its own dedicated container)
const mainNavItems: NavItem[] = [
  { path: '/', label: 'Today', icon: Home },
  { path: '/medicines', label: 'Medicines', icon: Pill },
  { path: '/history', label: 'Schedule', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const scanNavItem: NavItem = {
  path: '/scan',
  label: 'Scan',
  icon: ScanLine,
};

function NavLinkButton({ item, className = '' }: { item: NavItem; className?: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `
        relative flex flex-col items-center justify-center gap-1
        px-2 py-2.5 rounded-[16px] transition-all duration-200
        ${isActive ? 'bg-white/15' : 'hover:bg-white/5'}
        ${className}
      `}
    >
      {({ isActive }) => (
        <>
          <Icon
            className="w-[22px] h-[22px]"
            strokeWidth={isActive ? 2.2 : 1.8}
            color={isActive ? '#FFFFFF' : '#8A9099'}
          />
          <span
            className={`text-[10px] leading-none ${
              isActive ? 'font-semibold text-white' : 'font-medium text-[#8A9099]'
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function MobileLayout() {
  const location = useLocation();
  const logAction = useLogMedicationAction();
  const { activeAlarm } = useReminderAlarmStore();

  // Keep native notifications in sync with medicines
  useReminderScheduler();

  // Monitor time and trigger in-app alarms
  useReminderAlarm();

  const today = getTodayISO();

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
    // Schedule a snoozed native notification (fires again in 10 min)
    if (activeAlarm) {
      snoozeReminder(activeAlarm.medicine, time, 10);
    }
    logAction.mutate({
      medicineId,
      scheduledTime: `${today}T${time}:00`,
      status: 'snoozed',
    });
  };

  // Hide bottom nav on detail pages
  const hideNav =
    location.pathname.startsWith('/medicines/') ||
    location.pathname.startsWith('/auth');

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-md mx-auto pb-32 safe-top">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
          <div className="max-w-md mx-auto px-4 pb-3">
            <div className="flex items-stretch justify-between gap-2">
              {/* ===== Main nav container (4 items, moderate radius) ===== */}
              <div className="flex-1 bg-ink/95 backdrop-blur-xl rounded-[22px] shadow-float ring-1 ring-white/10">
                <div className="grid grid-cols-4 gap-1.5 p-1.5">
                  {mainNavItems.map((item) => (
                    <NavLinkButton key={item.path} item={item} className="w-full" />
                  ))}
                </div>
              </div>

              {/* ===== Scan — separate square container (moderate radius) ===== */}
              <div className="w-16 h-16 shrink-0 bg-ink/95 backdrop-blur-xl rounded-[18px] shadow-float ring-1 ring-white/10">
                <div className="h-full w-full p-1.5">
                  <NavLinkButton item={scanNavItem} className="w-full h-full" />
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* ===== In-app Reminder Alarm ===== */}
      <ReminderAlarm
        onTaken={handleTaken}
        onSkip={handleSkip}
        onSnooze={handleSnooze}
      />
    </div>
  );
}