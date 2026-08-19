import { motion } from 'framer-motion';
import { FiCheck, FiEdit2, FiAlertTriangle, FiCopy } from 'react-icons/fi';
import type { ScannedMedicine, ValidationReport } from '@/types';
import { Badge, Button } from '@/components/common';
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
  if (confidence >= 80) return <Badge variant="success">{confidence}%</Badge>;
  if (confidence >= 50) return <Badge variant="warning">{confidence}%</Badge>;
  return <Badge variant="danger">{confidence}%</Badge>;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-[19px] font-semibold text-text tracking-tight">
            Detected Medicines
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            {medicines.length} found · {confidence}% overall confidence
          </p>
        </div>
        <Badge variant="success">
          <FiCheck className="w-3 h-3" /> AI Extracted
        </Badge>
      </div>

      {/* Validation warnings */}
      {hasWarnings && validation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/20 rounded-[20px] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="w-4 h-4 text-warning" />
            <h4 className="text-sm font-semibold text-warning">
              Review Required
            </h4>
          </div>
          <ul className="space-y-1">
            {validation.warnings.slice(0, 4).map((warning, i) => (
              <li key={i} className="text-xs text-warning/80">
                {warning.message}
              </li>
            ))}
            {validation.warnings.length > 4 && (
              <li className="text-xs text-warning/60">
                +{validation.warnings.length - 4} more...
              </li>
            )}
          </ul>
        </motion.div>
      )}

      <div className="space-y-3">
        {medicines.map((medicine, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="premium-card p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-text text-[15px]">
                    {medicine.name || 'Unknown Medicine'}
                  </h4>
                  {medicine.strength && (
                    <Badge variant="info">{medicine.strength}</Badge>
                  )}
                  {medicine.dosage && (
                    <Badge variant="neutral">{medicine.dosage}</Badge>
                  )}
                  {getConfidenceBadge(medicine.confidence)}
                </div>
                <div className="mt-2.5 space-y-1 text-sm text-secondary">
                  <p>
                    {FREQUENCY_LABELS[medicine.frequency]}
                    {medicine.times_per_day > 1
                      ? ` · ${medicine.times_per_day}x daily`
                      : ''}
                  </p>
                  {medicine.schedule_times.length > 0 && (
                    <p>{medicine.schedule_times.map(formatTime).join(', ')}</p>
                  )}
                  {medicine.duration_days && (
                    <p>For {medicine.duration_days} days</p>
                  )}
                  {medicine.instructions && (
                    <p className="text-xs text-secondary/80">
                      {medicine.instructions}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onEdit(index)}
                className="p-2.5 rounded-[12px] text-secondary bg-surface-muted hover:bg-border/60 transition-colors shrink-0 ml-2"
                aria-label={`Edit ${medicine.name}`}
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {validation && validation.duplicateCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-warning px-1">
          <FiCopy className="w-3.5 h-3.5" />
          {validation.duplicateCount} duplicate medicine(s) detected
        </div>
      )}

      <Button onClick={onSaveAll} fullWidth size="lg" loading={saving}>
        Save All Medicines
      </Button>
    </div>
  );
}