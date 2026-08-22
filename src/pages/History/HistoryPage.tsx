import { useState } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
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
    label: 'Completed',
    icon: Check,
    color: 'text-mint-deep',
    bg: 'bg-mint-soft',
    badge: 'success' as const,
  },
  skipped: {
    label: 'Skipped',
    icon: X,
    color: 'text-secondary',
    bg: 'bg-surface-muted',
    badge: 'neutral' as const,
  },
  snoozed: {
    label: 'Snoozed',
    icon: Clock,
    color: 'text-yellow-deep',
    bg: 'bg-yellow-soft',
    badge: 'warning' as const,
  },
  missed: {
    label: 'Missed',
    icon: AlertCircle,
    color: 'text-rose-deep',
    bg: 'bg-rose-soft',
    badge: 'danger' as const,
  },
  pending: {
    label: 'Upcoming',
    icon: Clock,
    color: 'text-blue-deep',
    bg: 'bg-blue-soft',
    badge: 'info' as const,
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
  const pendingCount = items.filter((log) => log.status === 'pending').length;

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

  if (isLoading) return <LoadingState variant="cards" label="Loading schedule..." />;

  if (error) {
    return (
      <ErrorState
        message="Failed to load medication history"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="px-3">
      <PageHeader title="Today's Schedule" subtitle="Your medication timeline" />

      {/* Range Selector — pill-shaped */}
      <div className="flex gap-2 mb-6">
        {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`
              flex-1 py-2.5 rounded-pill text-sm font-semibold transition-all duration-200 shadow-card
              ${
                range === r
                  ? 'bg-primary text-white shadow-button'
                  : 'bg-surface text-secondary border border-border hover:border-primary/30'
              }
            `}
          >
            {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-pastel-mint rounded-[16px] p-4 text-center">
          <p className="text-[24px] font-bold text-mint-deep tracking-tight">
            {takenCount}
          </p>
          <p className="text-[11px] font-medium text-mint-deep/70 mt-1">
            Completed
          </p>
        </div>
        <div className="bg-pastel-rose rounded-[16px] p-4 text-center">
          <p className="text-[24px] font-bold text-rose-deep tracking-tight">
            {missedCount}
          </p>
          <p className="text-[11px] font-medium text-rose-deep/70 mt-1">
            Missed
          </p>
        </div>
        <div className="bg-pastel-blue rounded-[16px] p-4 text-center">
          <p className="text-[24px] font-bold text-blue-deep tracking-tight">
            {pendingCount}
          </p>
          <p className="text-[11px] font-medium text-blue-deep/70 mt-1">
            Upcoming
          </p>
        </div>
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
              <div className="space-y-3">
                {groupedLogs[date].map((log) => {
                  const config = statusConfig[log.status];
                  const Icon = config.icon;
                  return (
                    <div key={log.id}>
                      <Card className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-11 h-11 rounded-[14px] ${config.bg} flex items-center justify-center shrink-0`}
                            >
                              <Icon className={`w-5 h-5 ${config.color}`} strokeWidth={2} />
                            </div>
                            <div>
                              <p className="font-semibold text-text text-[15px]">
                                {log.medicines?.name ?? 'Unknown Medicine'}
                              </p>
                              <p className="text-[13px] text-secondary mt-0.5">
                                {log.medicines?.dosage}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <Badge variant={config.badge}>
                              {config.label}
                            </Badge>
                            <p className="text-[13px] text-secondary mt-1.5 font-medium">
                              {formatTime(
                                log.scheduled_time.split('T')[1]?.slice(0, 5) ??
                                  '00:00'
                              )}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
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