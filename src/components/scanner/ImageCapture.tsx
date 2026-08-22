import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Upload, Camera as CameraIcon, ScanLine } from 'lucide-react';
import { Button, Badge } from '@/components/common';
import { preprocessImage, type ClientImageQuality } from '@/services/image/enhance';

interface ImageCaptureProps {
  onImageCaptured: (imageData: string) => void;
  loading?: boolean;
}

export function ImageCapture({
  onImageCaptured,
  loading = false,
}: ImageCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [quality, setQuality] = useState<ClientImageQuality | null>(null);
  const [enhanced, setEnhanced] = useState(false);

  const handleImageData = async (imageData: string) => {
    setProcessing(true);
    try {
      const result = await preprocessImage(imageData);
      setQuality(result.quality);
      setEnhanced(result.enhancedApplied);
      setPreview(result.enhanced);
      onImageCaptured(result.enhanced);
    } catch (error) {
      console.error('Failed to preprocess image:', error);
      setPreview(imageData);
      onImageCaptured(imageData);
    } finally {
      setProcessing(false);
    }
  };

  const handleCapture = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        await handleImageData(photo.dataUrl ?? '');
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
              await handleImageData(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('Failed to capture image:', error);
    }
  };

  const handleUpload = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        await handleImageData(photo.dataUrl ?? '');
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
              await handleImageData(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const getQualityBadge = () => {
    if (!quality) return null;
    if (quality.readable && quality.blur < 40) {
      return <Badge variant="success">Good quality</Badge>;
    }
    return (
      <Badge variant="warning">
        Enhanced
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {preview ? (
        <div className="relative rounded-[16px] overflow-hidden shadow-card">
          <img
            src={preview}
            alt="Prescription preview"
            className="w-full h-auto block"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            {getQualityBadge()}
            {enhanced && <Badge variant="info">Auto-enhanced</Badge>}
          </div>
        </div>
      ) : (
        <div className="premium-card p-8 text-center">
          {/* Minimal illustration */}
          <div className="w-20 h-20 mx-auto rounded-[12px] bg-blue-soft flex items-center justify-center mb-6">
            <ScanLine className="w-9 h-9 text-blue-deep" strokeWidth={1.5} />
          </div>
          <h3 className="text-[22px] font-bold text-text tracking-tight mb-2">
            Prescription Scanner
          </h3>
          <p className="text-[15px] text-secondary mb-8 max-w-xs mx-auto leading-relaxed">
            Take a photo or upload an image of your prescription. Our AI will extract the details instantly.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleCapture}
              fullWidth
              loading={loading || processing}
              className="min-h-[56px]"
            >
              <CameraIcon className="w-5 h-5" strokeWidth={2} />
              Camera
            </Button>
            <Button variant="outline" onClick={handleUpload} fullWidth className="min-h-[56px]">
              <Upload className="w-5 h-5" strokeWidth={2} /> Upload
            </Button>
          </div>
          <p className="mt-6 text-[12px] text-secondary/70">
            Images are auto-enhanced for better recognition
          </p>
        </div>
      )}
    </div>
  );
}