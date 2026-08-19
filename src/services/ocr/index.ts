import { supabase } from '@/services/supabase/client';
import type { ScanResult } from '@/types';

/**
 * OCR Service - Gemini 2.5 Flash/Pro Vision via Edge Function
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
    throw new Error(`Edge function error: ${error.message}`);
  }

  if (!data || !data.medicines) {
    throw new Error('Invalid response from edge function');
  }

  return {
    medicines: data.medicines,
    rawText: data.rawText ?? '',
    confidence: data.confidence ?? 0,
    imageQuality: data.imageQuality,
    validation: data.validation,
  };
}