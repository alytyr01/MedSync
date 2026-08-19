import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { processPrescriptionImage } from '@/services/ocr';
import { useCreateMedicine } from '@/hooks/useMedicines';
import { ImageCapture } from '@/components/scanner/ImageCapture';
import { ScanResult } from '@/components/scanner/ScanResult';
import { Modal, LoadingState, ErrorState } from '@/components/common';
import { MedicineForm } from '@/components/forms/MedicineForm';
import type { ScannedMedicine, ScanResult as ScanResultType } from '@/types';
import type { MedicineFormData } from '@/utils/validation';
import { getTodayISO } from '@/utils/format';

type PipelineStage =
  | 'capture'
  | 'quality'
  | 'enhance'
  | 'ai'
  | 'review';

const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'capture', label: 'Capturing image' },
  { id: 'quality', label: 'Checking image quality' },
  { id: 'enhance', label: 'Enhancing image' },
  { id: 'ai', label: 'AI extracting medicines' },
  { id: 'review', label: 'Ready for review' },
];

export function ScanPage() {
  const navigate = useNavigate();
  const createMedicine = useCreateMedicine();

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('capture');

  const handleImageCaptured = async (data: string) => {
    setError(null);
    setScanning(true);
    setPipelineStage('quality');

    try {
      setPipelineStage('enhance');
      const result = await processPrescriptionImage({ imageData: data });
      setPipelineStage('ai');
      setScanResult(result);
      setPipelineStage('review');
    } catch (err) {
      console.error('Scan failed:', err);
      setError('Failed to process the prescription image. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleEditMedicine = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveAll = async () => {
    if (!scanResult) return;
    setSaving(true);

    try {
      for (const medicine of scanResult.medicines) {
        const formData: MedicineFormData = {
          name: medicine.name,
          dosage: medicine.strength || medicine.dosage,
          frequency: medicine.frequency,
          times_per_day: medicine.times_per_day,
          schedule_times: medicine.schedule_times,
          duration_days: medicine.duration_days,
          start_date: getTodayISO(),
          instructions: medicine.instructions ?? '',
          notes: '',
          total_quantity: 0,
          low_stock_threshold: 5,
          refill_reminder: true,
        };
        await createMedicine.mutateAsync(formData);
      }

      navigate('/medicines');
    } catch (err) {
      console.error('Failed to save medicines:', err);
      setError('Failed to save medicines. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (data: MedicineFormData) => {
    if (editingIndex === null || !scanResult) return;

    const updated = [...scanResult.medicines];
    updated[editingIndex] = {
      name: data.name,
      strength: data.dosage,
      dosage: data.dosage,
      frequency: data.frequency,
      times_per_day: data.times_per_day,
      schedule_times: data.schedule_times,
      duration_days: data.duration_days,
      instructions: data.instructions,
      confidence: 100,
    };

    setScanResult({ ...scanResult, medicines: updated });
    setEditingIndex(null);
  };

  const editingMedicine: ScannedMedicine | null =
    editingIndex !== null && scanResult
      ? scanResult.medicines[editingIndex]
      : null;

  const currentStageIndex = PIPELINE_STAGES.findIndex(
    (s) => s.id === pipelineStage
  );

  return (
    <div className="px-5">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pt-7 pb-5"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-secondary hover:bg-surface-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        <h1 className="text-[26px] font-bold text-text tracking-tight">
          Scan Prescription
        </h1>
      </motion.header>

      {error && (
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setScanResult(null);
          }}
        />
      )}

      {/* Step 1: Capture image */}
      {!scanResult && !error && (
        <ImageCapture
          onImageCaptured={handleImageCaptured}
          loading={scanning}
        />
      )}

      {/* Processing AI */}
      {scanning && !scanResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <LoadingState label="Analyzing prescription with Gemini AI..." />
          {/* Pipeline progress indicator */}
          <div className="mt-5 premium-card p-5 space-y-3">
            {PIPELINE_STAGES.map((stage, i) => (
              <div
                key={stage.id}
                className={`
                  flex items-center gap-3 text-sm
                  ${i <= currentStageIndex
                    ? 'text-text'
                    : 'text-text-tertiary/50'}
                `}
              >
                <div
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0
                    ${
                      i < currentStageIndex
                        ? 'bg-success/10 text-success'
                        : i === currentStageIndex
                          ? 'bg-primary-soft text-primary animate-soft-pulse'
                          : 'bg-surface-muted text-text-tertiary'
                    }
                  `}
                >
                  {i < currentStageIndex ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {stage.label}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Review & edit */}
      {scanResult && !scanning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <ScanResult
            medicines={scanResult.medicines}
            confidence={scanResult.confidence}
            validation={scanResult.validation}
            onEdit={handleEditMedicine}
            onSaveAll={handleSaveAll}
            saving={saving}
          />
        </motion.div>
      )}

      {/* Edit Medicine Modal */}
      <Modal
        isOpen={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        title="Edit Medicine"
      >
        {editingMedicine && (
          <MedicineForm
            onSubmit={handleEditSubmit}
            submitLabel="Update Medicine"
            initialData={{
              name: editingMedicine.name,
              dosage: editingMedicine.strength || editingMedicine.dosage,
              frequency: editingMedicine.frequency,
              times_per_day: editingMedicine.times_per_day,
              schedule_times: editingMedicine.schedule_times,
              duration_days: editingMedicine.duration_days,
              start_date: getTodayISO(),
              instructions: editingMedicine.instructions,
            }}
          />
        )}
      </Modal>
    </div>
  );
}

