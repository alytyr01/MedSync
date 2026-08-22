import { Check, Clock, X, Bell } from 'lucide-react';
import type { Medicine } from '@/types';
import { formatTime } from '@/utils/format';

interface ReminderItemProps {
  medicine: Medicine;
  time: string;
  onTaken: () => void;
  onSkip: () => void;
  onSnooze: () => void;
}

export function ReminderItem({
  medicine,
  time,
  onTaken,
  onSkip,
  onSnooze,
}: ReminderItemProps) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[14px] bg-blue-soft flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-blue-deep" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-semibold text-text text-[15px] leading-tight">
              {medicine.name}
            </h4>
            <p className="text-[13px] text-secondary mt-0.5">
              {medicine.dosage}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary bg-primary-soft rounded-full px-3 py-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5" strokeWidth={2} />
          <span className="text-[13px] font-semibold leading-none">
            {formatTime(time)}
          </span>
        </div>
      </div>

      <div className="flex gap-2.5 mt-4">
        <button
          onClick={onTaken}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-pill bg-primary text-white text-sm font-semibold hover:bg-primary-light active:bg-primary-dark active:scale-[0.98] transition-all duration-200 shadow-button"
        >
          <Check className="w-4 h-4" strokeWidth={2.2} /> Taken
        </button>
        <button
          onClick={onSnooze}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-pill bg-yellow-soft text-yellow-deep text-sm font-semibold hover:bg-yellow-soft/70 active:scale-[0.98] transition-all duration-200"
        >
          <Clock className="w-4 h-4" strokeWidth={2} /> Snooze
        </button>
        <button
          onClick={onSkip}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-pill bg-surface-muted text-secondary text-sm font-medium hover:bg-border/60 active:scale-[0.98] transition-all duration-200"
        >
          <X className="w-4 h-4" strokeWidth={2} /> Skip
        </button>
      </div>
    </div>
  );
}
