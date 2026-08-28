import { Check, Edit2, AlertTriangle, Copy, Pill } from 'lucide-react';
import type { ScannedMedicine, ValidationReport } from '@/types';
import { Button } from '@/components/common';
import { formatTime } from '@/utils/format';
import { FREQUENCY_LABELS } from '@/constants';

interface ScanResultProps {
  medicines: ScannedMedicine[];
  confidence: number;
  validation?: ValidationReport;
  onEdit: (index: number) => void;
  onSaveAll: () => void;
  saving?: boolean;
}

function getConfidenceBadge(confidence: number) {
  const tone =
    confidence >= 80
      ? 'text-success'
      : confidence >= 50
        ? 'text-yellow-deep'
        : 'text-danger';
  return (
    <span className={`text-[11px] font-semibold ${tone}`}>{confidence}%</span>
  );
}

export function ScanResult({
  medicines,
  confidence,
  validation,
  onEdit,
  onSaveAll,
  saving = false,
}: ScanResultProps) {
  const hasWarnings = validation?.hasIssues ?? false;

  return (
    <div className="space-y-5">
      {/* Summary hero — overall AI confidence as the focal point */}
      <div className="px-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-text-tertiary">
            Scan results
          </p>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
            <Check className="w-3 h-3" strokeWidth={2} /> AI extracted
          </span>
        </div>
        <p className="mt-2 text-[34px] font-bold text-text tracking-tight leading-none tabular-nums">
          {confidence}
          <span className="text-[17px] text-text-secondary">%</span>
          <span className="ml-2 text-[12px] font-medium text-text-secondary tracking-normal">
            overall confidence
          </span>
        </p>
        <div
          className="w-full mt-3 progress-track"
          role="progressbar"
          aria-valuenow={confidence}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Extraction confidence ${confidence}%`}
        >
          <div
            className="progress-fill bg-primary"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <p className="mt-2.5 text-[12px] font-medium text-text-secondary">
          {medicines.length}{' '}
          {medicines.length === 1 ? 'medicine' : 'medicines'} found
        </p>
      </div>

      {/* Validation warnings */}
      {hasWarnings && validation && (
        <div className="flex items-start gap-2.5 rounded-[14px] bg-yellow-soft px-3.5 py-3">
          <AlertTriangle
            className="w-4 h-4 text-yellow-deep shrink-0 mt-0.5"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-yellow-deep">
              Review recommended
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {validation.warnings.slice(0, 2).map((warning, i) => (
                <li
                  key={i}
                  className="text-[11.5px] text-yellow-deep/85 leading-snug"
                >
                  {warning.message}
                </li>
              ))}
              {validation.warnings.length > 2 && (
                <li className="text-[11.5px] text-yellow-deep/60">
                  +{validation.warnings.length - 2} more
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden divide-y divide-border-subtle">
        {medicines.map((medicine, index) => {
          const meta = [
            FREQUENCY_LABELS[medicine.frequency],
            medicine.times_per_day > 1
              ? `${medicine.times_per_day}x daily`
              : null,
            medicine.duration_days ? `${medicine.duration_days} days` : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <div key={index} className="flex items-start gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-[10px] bg-blue-soft flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4 text-blue-deep" strokeWidth={2} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[14px] font-semibold text-text tracking-tight truncate">
                    {medicine.name || 'Unknown Medicine'}
                  </p>
                  {getConfidenceBadge(medicine.confidence)}
                </div>
                {meta && (
                  <p className="text-[12px] text-text-secondary truncate mt-0.5 leading-snug">
                    {meta}
                  </p>
                )}
                {medicine.schedule_times.length > 0 && (
                  <p className="text-[12px] text-text-secondary tabular-nums mt-0.5 leading-snug">
                    {medicine.schedule_times.map(formatTime).join(' · ')}
                  </p>
                )}
                {medicine.instructions && (
                  <p className="text-[12px] text-text-tertiary mt-1 leading-snug">
                    {medicine.instructions}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEdit(index)}
                className="p-2 rounded-[10px] text-secondary bg-surface-muted hover:bg-border/60 transition-colors shrink-0"
                aria-label={`Edit ${medicine.name || 'medicine'}`}
              >
                <Edit2 className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      {validation && validation.duplicateCount > 0 && (
        <p className="flex items-center gap-2 text-[12px] font-medium text-yellow-deep px-1">
          <Copy className="w-3.5 h-3.5" strokeWidth={2} />
          {validation.duplicateCount} duplicate
          {validation.duplicateCount === 1 ? '' : 's'} detected
        </p>
      )}

      <Button onClick={onSaveAll} fullWidth size="lg" loading={saving}>
        {!saving && <Check className="w-5 h-5" strokeWidth={2.2} />}
        Save {medicines.length}{' '}
        {medicines.length === 1 ? 'Medicine' : 'Medicines'}
      </Button>
    </div>
  );
}