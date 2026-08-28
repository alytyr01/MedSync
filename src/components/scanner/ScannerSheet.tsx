import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera as CameraIcon, Upload, X } from 'lucide-react';
import { processPrescriptionImage } from '@/services/ocr';
import { useCreateMedicine } from '@/hooks/useMedicines';
import { CameraPreview } from '@/components/scanner/CameraPreview';
import { ScanResult } from '@/components/scanner/ScanResult';
import { Modal, ErrorState } from '@/components/common';
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
  /** Open straight into the live camera viewfinder, skipping the source picker */
  autoCamera?: boolean;
}

/**
 * The full "Scan Prescription with AI" flow presented as a bottom sheet —
 * identical visual treatment (and animation) to the Add Medicine sheet.
 * 1. Intro card (Camera / Upload)  2. live viewfinder → capture
 * 3. AI processing  4. ScanResult review & edit
 */
export function ScannerSheet({ open, onClose, autoCamera = false }: ScannerSheetProps) {
  const navigate = useNavigate();
  const createMedicine = useCreateMedicine();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  // The Modal (source picker / processing / review) — in autoCamera mode it
  // stays closed until an image is actually captured, so ✕ from the live
  // viewfinder returns straight to where the user was.
  const [modalOpen, setModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('capture');
  // Set when the user abandons the flow (✕) — discards late-arriving results
  const flowCancelled = useRef(false);

  // Reset internal flow whenever the sheet is dismissed; when opening with
  // autoCamera, jump straight into the live viewfinder with NO modal behind
  // it — the modal only appears after a capture (processing/review).
  useEffect(() => {
    if (!open) {
      flowCancelled.current = true;
      setCameraOpen(false);
      setModalOpen(false);
      setScanning(false);
      setScanResult(null);
      setError(null);
      setSaving(false);
      setEditingIndex(null);
      setPipelineStage('capture');
    } else {
      flowCancelled.current = false;
      setCameraOpen(autoCamera);
      setModalOpen(!autoCamera);
    }
  }, [open, autoCamera]);

  const runScan = async (imageData: string) => {
    flowCancelled.current = false;
    setError(null);
    setScanning(true);

    // Small pause helper so each pre-processing stage is visible rather
    // than snapping through instantly.
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // 1) Capturing image — the source frame is read into the pipeline
      setPipelineStage('capture');
      await pause(500);
      if (flowCancelled.current) return;

      // 2) Checking image quality
      setPipelineStage('quality');
      await pause(450);
      if (flowCancelled.current) return;

      // 3) Enhancing image (auto-contrast/sharpening if needed)
      setPipelineStage('enhance');
      await pause(450);
      if (flowCancelled.current) return;

      // 4) AI extracting medicines — the ACTIVE stage for the full
      //    duration of the real AI/OCR work (the slow, network-bound leg)
      setPipelineStage('ai');
      const result = await processPrescriptionImage({ imageData });
      if (flowCancelled.current) return;

      // 5) Ready for review — hold briefly before revealing the results
      setPipelineStage('review');
      await pause(600);
      if (flowCancelled.current) return;

      setScanResult(result);
    } catch (err) {
      if (flowCancelled.current) return;
      console.error('Scan failed:', err);
      setError('Failed to process the prescription image. Please try again.');
    } finally {
      if (!flowCancelled.current) setScanning(false);
    }
  };

  /** ✕ on the full-screen review — Home entry: close all; nav: back to picker */
  const closeFlow = () => {
    flowCancelled.current = true;
    if (autoCamera) {
      onClose();
    } else {
      setScanResult(null);
      setError(null);
      setScanning(false);
      setModalOpen(true);
    }
  };

  const handleCameraCapture = (imageData: string) => {
    setCameraOpen(false);
    setModalOpen(false);
    void runScan(imageData);
  };

  const openFilePicker = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setModalOpen(false); // hand off to the full-screen processing/review
      void runScan(reader.result as string);
    };
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
        onClose={() => {
          // ✕ from the Home "Scan Prescription" entry closes the whole sheet
          // (back to Home); ✕ from the nav entry returns to the source picker.
          if (autoCamera) onClose();
          else setCameraOpen(false);
        }}
        onCaptured={handleCameraCapture}
      />

      {/* ===== Full-screen processing / review / error ===== */}
      {open && (scanning || scanResult || error) && (
        <div className="fixed inset-0 z-[45] bg-background overflow-y-auto overscroll-contain">
          <div className="max-w-md mx-auto px-5 pb-10">
            <header className="flex items-center gap-3 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
              {!scanning && (
                <button
                  type="button"
                  onClick={closeFlow}
                  className="w-9 h-9 -ml-1 rounded-full bg-surface-muted flex items-center justify-center text-secondary"
                  aria-label="Close scanner"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              )}
              <h1 className="text-[20px] font-bold text-text tracking-tight">
                Scan Prescription
              </h1>
            </header>

            {error ? (
              <ErrorState
                message={error}
                onRetry={() => {
                  flowCancelled.current = false;
                  setError(null);
                  setScanResult(null);
                  if (autoCamera) setCameraOpen(true);
                  else setModalOpen(true);
                }}
              />
            ) : scanning ? (
              <div className="pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-text-tertiary">
                  AI analysis
                </p>
                <h2 className="mt-2 text-[24px] font-bold text-text tracking-tight leading-tight">
                  Reading your prescription…
                </h2>
                <p className="mt-2 text-[13px] text-text-secondary">
                  This usually only takes a few seconds.
                </p>

                <div className="relative mt-9">
                  {/* Vertical rail connecting the stage dots */}
                  <div
                    className="absolute left-[11px] top-[11px] bottom-[11px] w-px bg-border-subtle"
                    aria-hidden
                  />
                  <div className="space-y-7">
                    {PIPELINE_STAGES.map((stage, i) => {
                      const done = i < currentStageIndex;
                      const active = i === currentStageIndex;
                      return (
                        <div
                          key={stage.id}
                          className="relative flex items-center gap-4"
                        >
                          <div
                            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 relative z-10 ${
                              done
                                ? 'bg-success/10 text-success'
                                : active
                                  ? 'bg-primary-soft text-primary'
                                  : 'bg-surface-muted text-text-tertiary'
                            }`}
                          >
                            {done ? (
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : active ? (
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span
                            className={`text-[14px] font-medium ${
                              done || active
                                ? 'text-text'
                                : 'text-text-tertiary'
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              scanResult && (
                <ScanResult
                  medicines={scanResult.medicines}
                  confidence={scanResult.confidence}
                  validation={scanResult.validation}
                  onEdit={setEditingIndex}
                  onSaveAll={handleSaveAll}
                  saving={saving}
                />
              )
            )}
          </div>
        </div>
      )}

      <Modal isOpen={open && modalOpen} onClose={onClose} title="Select Image Source">
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
