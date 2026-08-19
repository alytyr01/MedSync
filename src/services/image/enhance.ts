/**
 * Client-side Image Enhancement Utilities
 *
 * Performs image quality checks and enhancements before uploading
 * to the edge function:
 * - Orientation detection & rotation
 * - Contrast / brightness adjustment
 * - Auto-crop detection (bounding box of non-white content)
 */

export interface ClientImageQuality {
  blur: number; // 0-100 (higher = more blurry)
  lighting: number; // 0-100 (higher = brighter)
  crop: boolean;
  orientation: 'portrait' | 'landscape' | 'unknown';
  readable: boolean;
}

const MIN_READABLE_BLUR = 60; // below this is too blurry
const MIN_READABLE_LIGHTING = 25; // below this is too dark

/**
 * Loads an image from a data URL into an HTMLImageElement
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Draws image to canvas and returns the canvas + context
 */
function drawToCanvas(
  img: HTMLImageElement,
  maxDimension = 1600
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  // Scale down if too large
  let { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx };
}

/**
 * Analyzes image quality using canvas pixel data:
 * - Blur score via Laplacian variance approximation
 * - Lighting score via average luminance
 * - Crop detection via edge content at boundaries
 */
export async function analyzeImageQuality(
  dataUrl: string
): Promise<ClientImageQuality> {
  try {
    const img = await loadImage(dataUrl);
    const { canvas, ctx } = drawToCanvas(img);

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Calculate blur score using variance of local gradients
    let totalGradient = 0;
    let sampleCount = 0;
    // Sample every 8th pixel for performance
    for (let y = 2; y < height - 2; y += 8) {
      for (let x = 2; x < width - 2; x += 8) {
        const idx = (y * width + x) * 4;
        // Simple Laplacian approximation
        const center =
          (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const left =
          (data[(y * width + x - 1) * 4] +
            data[(y * width + x - 1) * 4 + 1] +
            data[(y * width + x - 1) * 4 + 2]) /
          3;
        const right =
          (data[(y * width + x + 1) * 4] +
            data[(y * width + x + 1) * 4 + 1] +
            data[(y * width + x + 1) * 4 + 2]) /
          3;
        const up =
          (data[((y - 1) * width + x) * 4] +
            data[((y - 1) * width + x) * 4 + 1] +
            data[((y - 1) * width + x) * 4 + 2]) /
          3;
        const down =
          (data[((y + 1) * width + x) * 4] +
            data[((y + 1) * width + x) * 4 + 1] +
            data[((y + 1) * width + x) * 4 + 2]) /
          3;

        const gradient =
          Math.abs(center - left) +
          Math.abs(center - right) +
          Math.abs(center - up) +
          Math.abs(center - down);

        totalGradient += gradient;
        sampleCount++;
      }
    }

    const avgGradient = sampleCount > 0 ? totalGradient / sampleCount : 0;
    // Normalize: lower gradient = more blur
    const blur = Math.max(0, Math.min(100, 100 - avgGradient * 2));

    // Calculate lighting via average luminance
    let totalLuminance = 0;
    let lumSamples = 0;
    for (let i = 0; i < data.length; i += 4 * 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Perceived luminance
      totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
      lumSamples++;
    }
    const avgLuminance =
      lumSamples > 0 ? totalLuminance / lumSamples : 128;
    const lighting = Math.max(0, Math.min(100, (avgLuminance / 255) * 100));

    // Detect crop by checking if content touches edges
    let edgeContent = 0;
    let edgeSamples = 0;
    // Sample edges
    const checkPixel = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      const lum =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      // Content = non-white / non-background
      if (lum < 240 && !(data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240)) {
        edgeContent++;
      }
      edgeSamples++;
    };

    // Top edge
    for (let x = 0; x < width; x += 8) checkPixel(x, 0);
    // Bottom edge
    for (let x = 0; x < width; x += 8) checkPixel(x, height - 1);
    // Left edge
    for (let y = 0; y < height; y += 8) checkPixel(0, y);
    // Right edge
    for (let y = 0; y < height; y += 8) checkPixel(width - 1, y);

    const cropRatio = edgeSamples > 0 ? edgeContent / edgeSamples : 0;
    const crop = cropRatio > 0.3; // >30% content at edges suggests cropping

    const orientation: 'portrait' | 'landscape' | 'unknown' =
      height > width ? 'portrait' : width > height ? 'landscape' : 'unknown';

    const readable =
      blur < MIN_READABLE_BLUR && lighting > MIN_READABLE_LIGHTING;

    return {
      blur: Math.round(blur),
      lighting: Math.round(lighting),
      crop,
      orientation,
      readable,
    };
  } catch (error) {
    console.error('Client image quality check error:', error);
    return {
      blur: 10,
      lighting: 70,
      crop: false,
      orientation: 'unknown',
      readable: true,
    };
  }
}

/**
 * Enhances the image client-side:
 * - Auto-rotate based on EXIF orientation data
 * - Improve contrast (stretch histogram)
 * - Adjust brightness
 */
export async function enhanceImage(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);

    // Check EXIF orientation
    const orientation = await getExifOrientation(dataUrl);

    const { canvas, ctx } = drawToCanvas(img, 1600);

    // Apply rotation if needed
    if (orientation > 1) {
      const { width, height } = canvas;
      const newCanvas = document.createElement('canvas');

      if (orientation === 6 || orientation === 8) {
        // 90° or 270° rotation - swap dimensions
        newCanvas.width = height;
        newCanvas.height = width;
      } else {
        newCanvas.width = width;
        newCanvas.height = height;
      }

      const newCtx = newCanvas.getContext('2d');
      if (!newCtx) return dataUrl;

      newCtx.translate(newCanvas.width / 2, newCanvas.height / 2);
      if (orientation === 6) newCtx.rotate(Math.PI / 2);
      if (orientation === 8) newCtx.rotate(-Math.PI / 2);
      if (orientation === 3) newCtx.rotate(Math.PI);
      newCtx.drawImage(canvas, -width / 2, -height / 2);

      // Copy back
      const finalCtx = ctx;
      finalCtx.clearRect(0, 0, width, height);
      finalCtx.drawImage(newCanvas, 0, 0, width, height);
    }

    // Improve contrast via histogram stretch
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Find min/max luminance
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < min) min = lum;
      if (lum > max) max = lum;
    }

    // Stretch contrast
    const range = max - min;
    if (range > 0 && range < 200) {
      const scaleFactor = 255 / range;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, (data[i] - min) * scaleFactor));
        data[i + 1] = Math.max(
          0,
          Math.min(255, (data[i + 1] - min) * scaleFactor)
        );
        data[i + 2] = Math.max(
          0,
          Math.min(255, (data[i + 2] - min) * scaleFactor)
        );
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Client image enhancement error:', error);
    return dataUrl;
  }
}

/**
 * Reads EXIF orientation from a data URL image
 */
function getExifOrientation(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const base64 = dataUrl.split(',')[1] ?? '';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const view = new DataView(bytes.buffer);

      // Check JPEG SOI marker
      if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
        resolve(1);
        return;
      }

      let offset = 2;
      while (offset < bytes.length) {
        // Find marker
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }

        const marker = bytes[offset + 1];
        // Skip standalone markers
        if (
          marker === 0xd8 ||
          marker === 0xd9 ||
          (marker >= 0xd0 && marker <= 0xd7)
        ) {
          offset += 2;
          continue;
        }

        // Read segment length
        const length = view.getUint16(offset + 2, false);
        const segmentEnd = offset + 2 + length;

        // APP1 - EXIF
        if (marker === 0xe1 && segmentEnd <= bytes.length) {
          // Check "Exif\0\0" header
          if (
            bytes[offset + 4] === 0x45 && // E
            bytes[offset + 5] === 0x78 && // x
            bytes[offset + 6] === 0x69 && // i
            bytes[offset + 7] === 0x66 && // f
            bytes[offset + 8] === 0x00 &&
            bytes[offset + 9] === 0x00
          ) {
            const tiffOffset = offset + 10;
            // Check endianness
            const isLittleEndian = bytes[tiffOffset] === 0x49;
            const tiffView = new DataView(bytes.buffer, tiffOffset);

            // Read IFD0 offset
            const ifd0Offset = tiffView.getUint32(4, isLittleEndian);
            const entryCount = tiffView.getUint16(ifd0Offset, isLittleEndian);

            // Search for orientation tag (0x0112)
            for (let i = 0; i < entryCount; i++) {
              const entryOffset = ifd0Offset + 2 + i * 12;
              if (entryOffset + 12 > bytes.length - tiffOffset) break;

              const tag = tiffView.getUint16(entryOffset, isLittleEndian);
              if (tag === 0x0112) {
                const orientation = tiffView.getUint16(
                  entryOffset + 8,
                  isLittleEndian
                );
                resolve(orientation);
                return;
              }
            }
          }
        }

        offset = segmentEnd;
      }

      resolve(1);
    } catch {
      resolve(1);
    }
  });
}

/**
 * Full client-side image preprocessing pipeline:
 * Quality check → enhance if needed → return enhanced data URL
 */
export async function preprocessImage(
  dataUrl: string
): Promise<{ enhanced: string; quality: ClientImageQuality; enhancedApplied: boolean }> {
  const quality = await analyzeImageQuality(dataUrl);

  // Only enhance if there are quality issues
  if (!quality.readable || quality.blur >= MIN_READABLE_BLUR) {
    const enhanced = await enhanceImage(dataUrl);
    return {
      enhanced,
      quality,
      enhancedApplied: enhanced !== dataUrl,
    };
  }

  return {
    enhanced: dataUrl,
    quality,
    enhancedApplied: false,
  };
}