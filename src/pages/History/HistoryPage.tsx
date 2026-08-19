import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiClock, FiAlertCircle } from 'react-icons/fi';
import { useMedicationLogs } from '@/hooks/useMedicationLogs';
import {
  PageHeader,
  Card,
  Badge,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import { formatDate, formatTime, getTodayISO } from '@/utils/format';
import { addDays } from '@/utils/format';

interface LogWithMedicine {
  id: string;
  medicine_id: string;
  scheduled_time: string;
  taken_at: string | null;
  status: 'taken' | 'skipped' | 'snoozed' | 'missed' | 'pending';
  skipped_reason: string | null;
  medicines?: {
    name: string;
    dosage: string;
  } | null;
}

const statusConfig = {
  taken: {
    label: 'Taken',
    icon: FiCheck,
    color: 'text-success',
    bg: 'bg-success/10',
    badge: 'success' as const,
  },
  skipped: {
    label: 'Skipped',
    icon: FiX,
    color: 'text-secondary',
    bg: 'bg-surface-muted',
    badge: 'neutral' as const,
  },
  snoozed: {
    label: 'Snoozed',
    icon: FiClock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    badge: 'warning' as const,
  },
  missed: {
    label: 'Missed',
    icon: FiAlertCircle,
    color: 'text-danger',
    bg: 'bg-danger/10',
    badge: 'danger' as const,
  },
  pending: {
    label: 'Pending',
    icon: FiClock,
    color: 'text-secondary',
    bg: 'bg-surface-muted',
    badge: 'neutral' as const,
  },
};

type DateRange = '7d' | '30d' | '90d';

export function HistoryPage() {
  const [range, setRange] = useState<DateRange>('7d');

  const endDate = getTodayISO();
  const startDate =
    range === '7d'
      ? addDays(endDate, -7)
      : range === '30d'
        ? addDays(endDate, -30)
        : addDays(endDate, -90);

  const { data: logs, isLoading, error, refetch } = useMedicationLogs(
    startDate,
    endDate
  );

  const items = (logs ?? []) as LogWithMedicine[];

  const takenCount = items.filter((log) => log.status === 'taken').length;
  const missedCount = items.filter((log) => log.status === 'missed').length;
  const skippedCount = items.filter((log) => log.status === 'skipped').length;

  // Group logs by date
  const groupedLogs = items.reduce<Record<string, LogWithMedicine[]>>(
    (acc, log) => {
      const date = log.scheduled_time.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(groupedLogs).sort((a, b) =>
    b.localeCompare(a)
  );

  if (isLoading) return <LoadingState variant="cards" label="Loading history..." />;

  if (error) {
    return (
      <ErrorState
        message="Failed to load medication history"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="px-5">
      <PageHeader title="History" subtitle="Your medication log" />

      {/* Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`
              flex-1 py-2.5 rounded-[14px] text-sm font-medium transition-all duration-200
              ${
                range === r
                  ? 'bg-primary text-white shadow-[0_2px_8px_rgba(46,122,88,0.2)]'
                  : 'bg-surface text-secondary border border-border hover:border-primary/30'
              }
            `}
          >
            {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-success tracking-tight">
            {takenCount}
          </p>
          <p className="text-xs text-secondary mt-1">Taken</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-danger tracking-tight">
            {missedCount}
          </p>
          <p className="text-xs text-secondary mt-1">Missed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-secondary tracking-tight">
            {skippedCount}
          </p>
          <p className="text-xs text-secondary mt-1">Skipped</p>
        </Card>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No medication history"
          description="Your medication logs will appear here as you take your medicines."
        />
      ) : (
        <div className="space-y-7 pb-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-[13px] font-semibold text-secondary uppercase tracking-wider mb-3 px-1">
                {formatDate(date)}
              </h3>
              <div className="space-y-2.5">
                {groupedLogs[date].map((log, index) => {
                  const config = statusConfig[log.status];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-[12px] ${config.bg} flex items-center justify-center shrink-0`}
                            >
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-text text-sm">
                                {log.medicines?.name ?? 'Unknown Medicine'}
                              </p>
                              <p className="text-xs text-secondary mt-0.5">
                                {log.medicines?.dosage}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <Badge variant={config.badge} dot>
                              {config.label}
                            </Badge>
                            <p className="text-xs text-secondary mt-1.5">
                              {formatTime(
                                log.scheduled_time.split('T')[1]?.slice(0, 5) ??
                                  '00:00'
                              )}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}