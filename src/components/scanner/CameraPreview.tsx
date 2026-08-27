import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { X, SwitchCamera, Upload, ImageOff } from 'lucide-react';

interface CameraPreviewProps {
  open: boolean;
  onClose: () => void;
  onCaptured: (imageData: string) => void;
}

type CamStatus = 'starting' | 'ready' | 'denied' | 'error';

/**
 * Full-screen LIVE camera viewfinder (getUserMedia) for scanning
 * prescriptions in-app — no native camera app hand-off. Includes a framing
 * guide, shutter, camera flip, and upload/native-camera fallbacks when the
 * stream is unavailable or permission is denied.
 */
export function CameraPreview({ open, onClose, onCaptured }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<CamStatus>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }

    let cancelled = false;

    const start = async () => {
      setStatus('starting');
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('unsupported');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            /* autoplay guard — muted + playsInline already set */
          }
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setErrorMsg('Allow camera access to scan prescriptions.');
          setStatus('denied');
        } else {
          setErrorMsg('No usable camera was found on this device.');
          setStatus('error');
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facing]);

  if (!open) return null;

  const flip = () =>
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'));

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    stopStream();
    onCaptured(canvas.toDataURL('image/jpeg', 0.92));
  };

  const nativeFallback = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      stopStream();
      onCaptured(photo.dataUrl ?? '');
    } catch {
      /* user cancelled the native camera */
    }
  };

  const openFilePicker = () => fileRef.current?.click();

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      stopStream();
      onCaptured(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Live feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Framing guide — dims everything outside the frame */}
      {status === 'ready' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[86%] h-[62%] rounded-[20px] border-2 border-dashed border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-black/45 flex items-center justify-center text-white"
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/85">
          Scan Prescription
        </span>
        <span className="w-9 h-9" />
      </div>

      {status === 'ready' && (
        <p className="relative z-10 text-center text-[12px] text-white/80 mt-4">
          Position the prescription inside the frame
        </p>
      )}

      {/* Starting spinner */}
      {status === 'starting' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3">
          <span className="w-7 h-7 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          <p className="text-[13px] text-white/70">Starting camera…</p>
        </div>
      )}

      {/* Denied / unavailable */}
      {(status === 'denied' || status === 'error') && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-white/85" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white">
              {status === 'denied' ? 'Camera access denied' : 'Camera unavailable'}
            </p>
            <p className="text-[13px] text-white/70 mt-1 leading-snug">
              {errorMsg}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-xs mt-1">
            {Capacitor.isNativePlatform() && (
              <button
                type="button"
                onClick={nativeFallback}
                className="py-3 rounded-pill bg-white text-[14px] font-semibold text-black"
              >
                Open camera app
              </button>
            )}
            <button
              type="button"
              onClick={openFilePicker}
              className="py-3 rounded-pill bg-white/10 border border-white/20 text-[14px] font-semibold text-white"
            >
              Upload an image
            </button>
            <button
              type="button"
              onClick={() => void start()}
              className="py-1 text-[13px] font-semibold text-white/70"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {status === 'ready' && (
        <div className="relative z-10 mt-auto flex items-center justify-between px-10 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={openFilePicker}
            className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white"
            aria-label="Upload an image"
          >
            <Upload className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={capture}
            className="w-[74px] h-[74px] rounded-full border-4 border-white/90 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Capture prescription"
          >
            <span className="w-[58px] h-[58px] rounded-full bg-white" />
          </button>

          <button
            type="button"
            onClick={flip}
            className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white"
            aria-label="Switch camera"
          >
            <SwitchCamera className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Hidden file input for the upload fallback */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}