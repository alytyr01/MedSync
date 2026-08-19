import { motion } from 'framer-motion';
import { FiCheck, FiClock, FiX, FiBell } from 'react-icons/fi';
import type { Medicine } from '@/types';
import { formatTime } from '@/utils/format';

interface ReminderItemProps {
  medicine: Medicine;
  time: string;
  onTaken: () => void;
  onSkip: () => void;
  onSnooze: () => void;
  index?: number;
}

export function ReminderItem({
  medicine,
  time,
  onTaken,
  onSkip,
  onSnooze,
  index = 0,
}: ReminderItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="premium-card p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[14px] bg-primary-soft flex items-center justify-center shrink-0">
            <FiBell className="w-5 h-5 text-primary" />
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
        <div className="flex items-center gap-1.5 text-primary shrink-0 bg-primary-soft rounded-full px-3 py-1.5">
          <FiClock className="w-3.5 h-3.5" />
          <span className="text-[13px] font-semibold leading-none">
            {formatTime(time)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onTaken}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] bg-primary text-white text-sm font-medium hover:bg-primary-dark active:scale-[0.98] transition-all duration-200 shadow-[0_2px_8px_rgba(46,122,88,0.15)]"
        >
          <FiCheck className="w-4 h-4" /> Taken
        </button>
        <button
          onClick={onSnooze}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] bg-primary-soft text-primary text-sm font-medium hover:bg-primary/15 active:scale-[0.98] transition-all duration-200"
        >
          <FiClock className="w-4 h-4" /> Snooze
        </button>
        <button
          onClick={onSkip}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] bg-surface-muted text-secondary text-sm font-medium hover:bg-border/60 active:scale-[0.98] transition-all duration-200"
        >
          <FiX className="w-4 h-4" /> Skip
        </button>
      </div>
    </motion.div>
  );
}