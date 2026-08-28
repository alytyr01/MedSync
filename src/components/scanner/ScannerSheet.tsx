import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera as CameraIcon, Upload } from 'lucide-react';
import { processPrescriptionImage } from '@/services/ocr';
import { useCreateMedicine } from '@/hooks/useMedicines';
import { CameraPreview } from '@/components/scanner/CameraPreview';
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

interface ScannerSheetProps {
  /** Visible while the Scan bottom-nav button is pressed */
  open: boolean;
  onClose: () => void;
}

/**
 * The full "Scan Prescription with AI" flow presented as a bottom sheet —
 * identical visual treatment (and animation) to the Add Medicine sheet.
 * 1. Intro card (Camera / Upload)  2. live viewfinder → capture
 * 3. AI processing  4. ScanResult review & edit
 */
export function ScannerSheet({ open, onClose }: ScannerSheetProps) {
  const navigate = useNavigate();
  const createMedicine = useCreateMedicine();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('capture');

  // Reset internal flow whenever the sheet is dismissed.
  useEffect(() => {
    if (!open) {
      setCameraOpen(false);
      setScanning(false);
      setScanResult(null);
      setError(null);
      setSaving(false);
      setEditingIndex(null);
      setPipelineStage('capture');
    }
  }, [open]);

  const runScan = async (imageData: string) => {
    setError(null);
    setScanning(true);
    setPipelineStage('quality');
    try {
      setPipelineStage('enhance');
      const result = await processPrescriptionImage({ imageData });
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

  const handleCameraCapture = (imageData: string) => {
    setCameraOpen(false);
    void runScan(imageData);
  };

  const openFilePicker = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => void runScan(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
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
      onClose();
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
    <>
      {/* Live full-screen viewfinder — overlays the sheet while active */}
      <CameraPreview
        open={open && cameraOpen && !scanResult && !error}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleCameraCapture}
      />

      <Modal isOpen={open} onClose={onClose} title="Select Image Source">
        {error && (
          <ErrorState
            message={error}
            onRetry={() => {
              setError(null);
              setScanResult(null);
            }}
          />
        )}

        {!error && scanning && !scanResult && (
          <div>
            <LoadingState label="Analyzing prescription with Gemini AI..." />
            <div className="mt-4 premium-card p-5 space-y-3">
              {PIPELINE_STAGES.map((stage, i) => (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 text-sm ${
                    i <= currentStageIndex
                      ? 'text-text'
                      : 'text-text-tertiary/50'
                  }`}
                >
                  <div
                    className={`
                      w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0
                      ${
                        i < currentStageIndex
                          ? 'bg-success/10 text-success'
                          : i === currentStageIndex
                            ? 'bg-primary-soft text-primary'
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
          </div>
        )}

        {!error && scanResult && !scanning && (
          <ScanResult
            medicines={scanResult.medicines}
            confidence={scanResult.confidence}
            validation={scanResult.validation}
            onEdit={setEditingIndex}
            onSaveAll={handleSaveAll}
            saving={saving}
          />
        )}

        {!error && !scanning && !scanResult && (
          <div className="py-1">
            <p className="text-[13px] text-text-secondary mb-4">
              Choose how you want to add the image
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-pill bg-primary text-white text-[15px] font-semibold shadow-button"
              >
                <CameraIcon className="w-5 h-5" strokeWidth={2} /> Camera
              </button>
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-pill bg-surface text-text border border-border-subtle text-[15px] font-semibold shadow-card"
              >
                <Upload className="w-5 h-5" strokeWidth={2} /> Upload
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
      </Modal>

      {/* Edit Medicine modal */}
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
    </>
  );
}
