import { supabase } from '@/services/supabase/client';
import type { ScanResult } from '@/types';

/**
 * OCR Service - Gemini Flash Vision via Edge Function
 *
 * Pipeline:
 * React App → Camera (Capacitor) → Convert Image → Base64
 * → Supabase Edge Function → Gemini API → Return JSON
 *
 * The base64 image is sent directly to the edge function.
 * No storage upload needed.
 */

export interface OcrOptions {
  imageData: string; // base64 or data URL
  fileName?: string;
}

export async function extractTextFromImage(
  options: OcrOptions
): Promise<string> {
  const result = await processPrescriptionImage(options);
  return result.rawText;
}

export async function processPrescriptionImage(
  options: OcrOptions
): Promise<ScanResult> {
  // Check if user is authenticated first
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Please sign in to scan prescriptions');
  }

  try {
    // Call Supabase Edge Function with base64 image directly
    const result = await callEdgeFunction(options.imageData);
    return result;
  } catch (error) {
    console.error('OCR pipeline error:', error);
    throw error;
  }
}

// ===== Call Edge Function with base64 image =====

async function callEdgeFunction(imageData: string): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke('scan-prescription', {
    body: {
      imageData,
    },
    });

  if (error) {
    let detail = '';
    try {
      detail = await (error as any).context?.text?.();
    } catch {}
    const reason = detail || (error as any).message || 'Edge Function returned a non-2xx status code';
    throw new Error(`Edge function error: ${reason}`);
  }

  if (!data || !data.medicines) {
    throw new Error('Invalid response from edge function');
  }

  // Normalize quota exhaustion — the UI surfaces a recoverable state
  // when the AI scan budget is hit.
  const quotaHit =
    data.error === 'quota_exhausted' ||
    /429/i.test(data.message ?? '') ||
    /quota/i.test(data.message ?? '');
  if (quotaHit) {
    const err: any = new Error('AI quota exhausted - retrying won\'t help right now');
    err.code = 'quota_exhausted';
    err.recoverable = true;
    throw err;
  }

  return {
    medicines: data.medicines,
    rawText: data.rawText ?? '',
    confidence: data.confidence ?? 0,
    imageQuality: data.imageQuality,
    validation: data.validation,
  };
}