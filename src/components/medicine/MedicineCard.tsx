import { useNavigate } from 'react-router-dom';
import { Clock, Pill } from 'lucide-react';
import type { Medicine } from '@/types';
import { formatTime, getDaysRemaining } from '@/utils/format';
import { FREQUENCY_LABELS } from '@/constants';

interface MedicineCardProps {
  medicine: Medicine;
  index?: number;
  stockRemaining?: number;
  totalStock?: number;
}

const pastelStyles = [
  { bg: 'bg-pastel-mint', text: 'text-mint-deep', soft: 'bg-white/60' },
  { bg: 'bg-pastel-blue', text: 'text-blue-deep', soft: 'bg-white/60' },
  { bg: 'bg-pastel-yellow', text: 'text-yellow-deep', soft: 'bg-white/60' },
  { bg: 'bg-pastel-orange', text: 'text-orange-deep', soft: 'bg-white/60' },
  { bg: 'bg-pastel-rose', text: 'text-rose-deep', soft: 'bg-white/60' },
  { bg: 'bg-pastel-violet', text: 'text-violet-deep', soft: 'bg-white/60' },
];

export function MedicineCard({ medicine, index = 0 }: MedicineCardProps) {
  const navigate = useNavigate();
  const daysRemaining = getDaysRemaining(medicine.end_date);
  const style = pastelStyles[index % pastelStyles.length];

  return (
    <div>
      <div
        onClick={() => navigate(`/medicines/${medicine.id}`)}
        className={`${style.bg} rounded-[16px] p-5 cursor-pointer active:scale-[0.98] transition-transform duration-200`}
      >
        <div className="flex items-start justify-between">
          <div className={`w-11 h-11 rounded-[14px] ${style.soft} flex items-center justify-center mb-3`}>
            <Pill className={`w-5 h-5 ${style.text}`} strokeWidth={2} />
          </div>
          <span className={`text-[11px] font-semibold ${style.text} bg-white/50 rounded-full px-3 py-1`}>
            {medicine.dosage}
          </span>
        </div>

        <h3 className={`font-semibold text-[16px] ${style.text} truncate leading-tight`}>
          {medicine.name}
        </h3>
        <p className={`text-[13px] ${style.text}/70 mt-1`}>
          {FREQUENCY_LABELS[medicine.frequency]}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${style.text}/70`} strokeWidth={2} />
            <span className={`text-[12px] font-medium ${style.text}/70`}>
              {medicine.schedule_times.map(formatTime).join(', ')}
            </span>
          </div>
          <span
            className={`text-[11px] font-semibold px-3 py-1 rounded-full ${
              daysRemaining !== null && daysRemaining <= 7
                ? 'bg-white/60 text-orange-deep'
                : 'bg-white/50 text-mint-deep'
            }`}
          >
            {daysRemaining !== null
              ? daysRemaining <= 7
                ? `${daysRemaining}d left`
                : 'Active'
              : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}
