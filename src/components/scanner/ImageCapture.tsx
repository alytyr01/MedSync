import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { motion } from 'framer-motion';
import { FiUpload } from 'react-icons/fi';
import { Button, Badge, Card } from '@/components/common';
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
    <div className="space-y-4">
      {preview ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-[20px] overflow-hidden shadow-card"
        >
          <img
            src={preview}
            alt="Prescription preview"
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            {(loading || processing) && (
              <div className="w-10 h-10 rounded-full border-3 border-white/30 border-t-white animate-spin" />
            )}
          </div>
          <div className="absolute top-3 left-3 flex gap-2">
            {getQualityBadge()}
            {enhanced && <Badge variant="info">Auto-enhanced</Badge>}
          </div>
        </motion.div>
      ) : (
        <Card className="p-8 text-center" padding="lg">
          <div className="w-16 h-16 mx-auto rounded-[14px] border-2 border-dashed border-border-subtle flex items-center justify-center mb-5">
            <div className="text-center">
              <div className="w-6 h-6 mx-auto border-2 border-text-tertiary rounded-sm mb-1" />
              <div className="w-10 h-0.5 mx-auto bg-text-tertiary/40" />
            </div>
          </div>
          <h3 className="text-[19px] font-semibold text-text tracking-tight mb-1">
            Scan Prescription
          </h3>
          <p className="text-sm text-secondary mb-7 max-w-xs mx-auto">
            Take a photo or upload an image of your prescription.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleCapture}
              fullWidth
              loading={loading || processing}
              className="min-h-[52px]"
            >
              Camera
            </Button>
            <Button variant="outline" onClick={handleUpload} fullWidth className="min-h-[52px]">
              <FiUpload className="w-4 h-4" /> Upload
            </Button>
          </div>
          <p className="mt-5 text-xs text-secondary/70">
            Images are auto-enhanced for better recognition
          </p>
        </Card>
      )}
    </div>
  );
}
