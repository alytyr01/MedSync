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
  // The raw captured image, shown as a preview at the top of the results
  const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
  const [errorTier, setErrorTier] = useState<'retry' | 'quota'>('retry');
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
      setPreviewImage(null);
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
    setPreviewImage(imageData); // remember the scan for the results preview
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
      const tier =
        (err as any)?.code === 'quota_exhausted' ||
        /AI quota exhausted/i.test((err as any)?.message ?? '')
          ? 'quota'
          : 'retry';
      setErrorTier(tier);
      const detail =
        err instanceof Error && err.message
          ? err.message
          : 'Please try again.';
      setError(`Failed to process the prescription image. ${detail}`);
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
                variant={errorTier === 'quota' ? 'quota' : 'default'}
                onRetry={
                  errorTier === 'quota'
                    ? undefined
                    : () => {
                        flowCancelled.current = false;
                        setError(null);
                        setScanResult(null);
                        if (autoCamera) setCameraOpen(true);
                        else setModalOpen(true);
                      }
                }
              />
            ) : scanning ? (
              <div className="pt-1">
                {/* Hero — reassuring headline + animated pulse chips */}
                <div className="rounded-[22px] bg-ink shadow-float ring-1 ring-white/10 px-5 pt-6 pb-5 overflow-hidden relative">
                  {/* soft glow accents */}
                  <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-teal-400/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
                  <p className="relative text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    AI analysis
                  </p>
                  <h2 className="relative mt-1.5 text-[22px] font-bold text-white tracking-tight leading-tight">
                    Reading your prescription
                  </h2>
                  <p className="relative mt-1.5 text-[12.5px] text-white/70 leading-snug">
                    Extracting each medicine, dose, and schedule…
                  </p>
                  {/* reassuring loading dots (static — only the circular spinner moves) */}
                  <div className="relative mt-5 flex items-center gap-1.5">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className={`w-1.5 h-1.5 rounded-full ${
                          d === 0 ? 'bg-teal-300' : 'bg-teal-300/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Stage progress — premium card with active emphasis */}
                <div className="mt-5 premium-card overflow-hidden">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const done = i < currentStageIndex;
                    const active = i === currentStageIndex;
                    return (
                      <div
                        key={stage.id}
                        className={`
                          relative px-4 py-3.5 flex items-center gap-3.5
                          ${i !== 0 ? 'border-t border-border-subtle' : ''}
                          ${active ? 'bg-primary-soft' : ''}
                        `}
                      >
                        {/* Status indicator */}
                        <div
                          className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 transition-all ${
                            done
                              ? 'bg-success/10 text-success'
                              : active
                                ? 'bg-primary text-white shadow-button'
                                : 'bg-surface-muted text-text-tertiary'
                          }`}
                        >
                          {done ? (
                            <svg
                              className="w-4 h-4"
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
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <span className="text-[13px] font-semibold">
                              {i + 1}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[14px] font-semibold tracking-tight ${
                              active
                                ? 'text-primary'
                                : done
                                  ? 'text-text'
                                  : 'text-text-tertiary'
                            }`}
                          >
                            {stage.label}
                          </p>
                          <p className="text-[11.5px] text-text-secondary/80 mt-0.5 leading-snug">
                            {stage.id === 'ai'
                              ? 'Google AI is scanning the details'
                              : stage.id === 'capture'
                                ? 'Reading the source image'
                                : stage.id === 'quality'
                                  ? 'Ensuring the image is clear'
                                  : stage.id === 'enhance'
                                    ? 'Improving contrast and detail'
                                    : 'Almost done — getting everything ready'}
                          </p>
                        </div>

                        {/* Progress % for the active stage */}
                        {active && (
                          <span className="shrink-0 text-[12px] font-bold text-text tabular-nums">
                            {Math.min(100, Math.round(((i + 1) / PIPELINE_STAGES.length) * 100))}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              scanResult && (
                <ScanResult
                  medicines={scanResult.medicines}
                  confidence={scanResult.confidence}
                  validation={scanResult.validation}
                  previewImage={previewImage}
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
