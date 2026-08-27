import { useState } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { useMedicationLogs } from '@/hooks/useMedicationLogs';
import {
  PageHeader,
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

/* Inline outcome cluster — dot · count · label */
function StatPill({
  dotClass,
  value,
  label,
}: {
  dotClass: string;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span className="text-[13px] font-semibold text-text tabular-nums">
        {value}
      </span>
      <span className="text-[11px] font-medium text-text-secondary">
        {label}
      </span>
    </span>
  );
}

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

  // Adherence rate — completed share of resolved outcomes (pending doesn't count against you)
  const resolvedCount = takenCount + missedCount;
  const completionRate =
    resolvedCount > 0 ? Math.round((takenCount / resolvedCount) * 100) : null;

  const rangeLabel =
    range === '7d'
      ? 'Last 7 days'
      : range === '30d'
        ? 'Last 30 days'
        : 'Last 90 days';

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

      {/* Range — segmented control */}
      <div className="grid grid-cols-3 gap-0.5 bg-border/60 rounded-pill p-1 mb-6">
        {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`py-2 rounded-pill text-[13px] font-semibold transition-colors duration-150 ${
              range === r
                ? 'bg-surface text-text shadow-card'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            {r === '7d' ? '7D' : r === '30d' ? '30D' : '90D'}
          </button>
        ))}
      </div>

      {/* Adherence — completion rate as the focal point */}
      <div className="premium-card px-4 py-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            Adherence
          </span>
          <span className="text-[10px] font-medium text-text-tertiary">
            {rangeLabel}
          </span>
        </div>

        {completionRate === null ? (
          <p className="mt-2.5 text-[15px] font-medium text-text-secondary">
            No outcomes logged yet
          </p>
        ) : (
          <>
            <p className="mt-2 text-[34px] font-bold text-text tracking-tight leading-none tabular-nums">
              {completionRate}
              <span className="text-[17px] text-text-secondary">%</span>
            </p>
            <div
              className="w-full mt-3 progress-track"
              role="progressbar"
              aria-valuenow={completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Adherence ${completionRate}%`}
            >
              <div
                className="progress-fill bg-primary"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </>
        )}

        <div className="mt-3.5 pt-3.5 border-t border-border-subtle flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <StatPill dotClass="bg-success" value={takenCount} label="Taken" />
          <StatPill dotClass="bg-danger" value={missedCount} label="Missed" />
          <StatPill dotClass="bg-primary" value={pendingCount} label="Due" />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No medication history"
          description="Your medication logs will appear here as you take your medicines."
        />
      ) : (
        <div className="space-y-6 pb-6">
          {sortedDates.map((date) => {
            const isToday = date === getTodayISO();
            return (
              <section key={date}>
                {/* Day marker + dose count */}
                <div className="flex items-baseline justify-between px-1 mb-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    {isToday ? 'Today' : formatDate(date)}
                  </h3>
                  <span className="text-[11px] font-medium text-text-tertiary tabular-nums">
                    {groupedLogs[date].length}{' '}
                    {groupedLogs[date].length === 1 ? 'dose' : 'doses'}
                  </span>
                </div>

                {/* Day group — a single card, hairline-separated dose rows */}
                <div className="premium-card overflow-hidden divide-y divide-border-subtle">
                  {groupedLogs[date].map((log) => {
                    const config = statusConfig[log.status];
                    const time = log.scheduled_time.split('T')[1]?.slice(0, 5);

                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-3.5 px-4 py-3"
                      >
                        {/* Dose time as the leading rail */}
                        <span className="w-[74px] shrink-0 text-[13px] font-semibold text-text tabular-nums leading-none">
                          {time ? formatTime(time) : '—'}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-text tracking-tight truncate leading-snug">
                            {log.medicines?.name ?? 'Unknown Medicine'}
                          </p>
                          {log.medicines?.dosage && (
                            <p className="text-[12px] text-text-secondary truncate mt-0.5 leading-snug">
                              {log.medicines.dosage}
                            </p>
                          )}
                        </div>

                        <Badge variant={config.badge} className="shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}