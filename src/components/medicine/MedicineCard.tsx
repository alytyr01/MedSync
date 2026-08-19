import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiChevronRight } from 'react-icons/fi';
import type { Medicine } from '@/types';
import { Badge, Card } from '@/components/common';
import { formatTime, getDaysRemaining } from '@/utils/format';
import { FREQUENCY_LABELS } from '@/constants';

interface MedicineCardProps {
  medicine: Medicine;
  index?: number;
}

export function MedicineCard({ medicine, index = 0 }: MedicineCardProps) {
  const navigate = useNavigate();
  const daysRemaining = getDaysRemaining(medicine.end_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card interactive padding="md" onClick={() => navigate(`/medicines/${medicine.id}`)}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text text-[15px] truncate">
                {medicine.name}
              </h3>
              <Badge variant="info">{medicine.dosage}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-secondary">
              <span>{FREQUENCY_LABELS[medicine.frequency]}</span>
              {medicine.schedule_times.length > 0 && (
                <span className="flex items-center gap-1">
                  <FiClock className="w-3.5 h-3.5" />
                  {medicine.schedule_times.map(formatTime).join(', ')}
                </span>
              )}
            </div>
            {daysRemaining !== null && (
              <p className="mt-1.5 text-xs text-secondary">
                {daysRemaining} days remaining
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
            <FiChevronRight className="w-4 h-4 text-text-tertiary" />
            <Badge variant={daysRemaining !== null && daysRemaining <= 7 ? 'warning' : 'neutral'} dot>
              {daysRemaining !== null
                ? daysRemaining <= 7
                  ? 'Ending soon'
                  : 'Active'
                : 'Active'}
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
