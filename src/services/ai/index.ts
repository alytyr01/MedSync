import type { ScannedMedicine, ScanResult } from '@/types';

/**
 * AI Service - Client-side fallback
 *
 * The primary AI extraction happens in the Supabase Edge Function
 * (scan-prescription) which uses Gemini 2.5 Flash/Pro Vision.
 *
 * This service provides a rule-based fallback if the edge function fails.
 */

export interface AiExtractionResult {
  medicines: ScannedMedicine[];
  confidence: number;
}

export async function extractMedicineData(
  rawText: string
): Promise<AiExtractionResult> {
  const medicines = parseMedicinesFromText(rawText);

  // Calculate overall confidence
  const confidence =
    medicines.length > 0
      ? Math.round(
          medicines.reduce((sum, m) => sum + m.confidence, 0) / medicines.length
        )
      : 0;

  return {
    medicines,
    confidence,
  };
}

export async function analyzePrescription(
  rawText: string
): Promise<ScanResult> {
  const { medicines, confidence } = await extractMedicineData(rawText);

  return {
    medicines,
    rawText,
    confidence,
  };
}

// ===== Rule-based Medicine Parser =====

function parseMedicinesFromText(text: string): ScannedMedicine[] {
  const lines = text.split('\n');
  const medicines: ScannedMedicine[] = [];
  let current: ScannedMedicine | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const medMatch = trimmed.match(
      /^(?:\d+[.)]\s*)?([A-Za-z][A-Za-z\s-]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|tablet|cap|capsule|tab|pill|unit)s?)\s*$/i
    );

    if (medMatch) {
      if (current) medicines.push(current);

      const rawName = medMatch[1].trim();
      const rawStrength = medMatch[2].trim();

      current = {
        name: rawName,
        strength: rawStrength,
        dosage: '',
        frequency: 'daily',
        times_per_day: 1,
        schedule_times: ['08:00'],
        duration_days: null,
        instructions: null,
        confidence: 90,
      };
      continue;
    }

    if (!current) continue;

    if (/three times daily|3 times daily|tid|t\.i\.d/i.test(trimmed)) {
      current.times_per_day = 3;
      current.schedule_times = ['08:00', '14:00', '20:00'];
      current.confidence = Math.min(100, current.confidence + 2);
    } else if (/twice daily|2 times daily|bid|b\.i\.d/i.test(trimmed)) {
      current.times_per_day = 2;
      current.schedule_times = ['08:00', '20:00'];
      current.confidence = Math.min(100, current.confidence + 2);
    } else if (/once daily|1 time daily|qd|q\.d|daily/i.test(trimmed)) {
      current.times_per_day = 1;
      current.schedule_times = ['08:00'];
      current.confidence = Math.min(100, current.confidence + 2);
    } else if (/as needed|prn|p\.r\.n/i.test(trimmed)) {
      current.frequency = 'as_needed';
      current.times_per_day = 1;
      current.schedule_times = ['08:00'];
      current.confidence = Math.min(100, current.confidence + 2);
    }

    // Parse dosage from instruction patterns
    const dosageMatch = trimmed.match(/(\d+)\s*(?:tablet|tab|capsule|cap|pill|ml|mg|mcg|g)s?\b/i);
    if (dosageMatch) {
      current.dosage = dosageMatch[0];
      current.confidence = Math.min(100, current.confidence + 1);
    }

    const durationMatch = trimmed.match(/for\s+(\d+)\s+days?/i);
    if (durationMatch) {
      current.duration_days = parseInt(durationMatch[1], 10);
      current.confidence = Math.min(100, current.confidence + 2);
    }

    if (
      /take with food|take in the morning|do not exceed|take before|take after|empty stomach|with meals/i.test(
        trimmed
      )
    ) {
      current.instructions = trimmed;
      current.confidence = Math.min(100, current.confidence + 2);
    }

    // Penalize for missing strength/dosage
    if (!current.strength) {
      current.confidence = Math.max(0, current.confidence - 5);
    }
    if (!current.dosage) {
      current.confidence = Math.max(0, current.confidence - 5);
    }
  }

  if (current) medicines.push(current);

  return medicines;
}