// Supabase Edge Function: scan-prescription
//
// Flow: React App → Base64 Image → Edge Function → Gemini 2.5 Flash Vision → JSON
//
// Securely calls the Gemini API with the user's prescription image
// and returns structured medicine data.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized: Missing Authorization header' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return json({ error: 'Unauthorized: Invalid or expired session' }, 401);
    }

    if (!GEMINI_API_KEY) {
      return json(
        {
          error:
            'GEMINI_API_KEY not configured. Run: supabase secrets set GEMINI_API_KEY=your-key',
        },
        500
      );
    }

    const { imageData } = await req.json();

    if (!imageData) {
      return json({ error: 'imageData (base64) is required' }, 400);
    }

    // Extract base64 and mime type from data URL or raw base64
    let base64: string;
    let mimeType = 'image/jpeg';

    if (imageData.startsWith('data:')) {
      const match = imageData.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) return json({ error: 'Invalid data URL' }, 400);
      mimeType = match[1];
      base64 = match[2];
    } else {
      base64 = imageData;
    }

    // Call Gemini 2.5 Flash Vision
    const result = await callGemini(base64, mimeType);

    if (!result.success) {
      return json({ error: result.error }, 422);
    }

    return json(
      {
        medicines: result.medicines,
        confidence: result.confidence,
      },
      200
    );
  } catch (error) {
    console.error('scan-prescription error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});

// ===== Gemini API Call =====

interface Medicine {
  name: string;
  strength: string;
  dosage: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed';
  times_per_day: number;
  schedule_times: string[];
  duration_days: number | null;
  instructions: string | null;
  confidence: number;
}

async function callGemini(
  base64: string,
  mimeType: string
): Promise<{
  success: boolean;
  medicines: Medicine[];
  confidence: number;
  error?: string;
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `You are a pharmacist.

Analyze this prescription image.

Extract every medication.

Return ONLY valid JSON.

{
  "medicines":[
    {
      "name":"",
      "strength":"",
      "dosage":"",
      "frequency":"",
      "duration":"",
      "instructions":"",
      "confidence":0
    }
  ]
}

Rules:
- Never guess medicine names.
- If unreadable, leave the field blank.
- Include a confidence score (0–100) for each medicine.
- Do not include explanations.

Field mapping:
- "frequency": one of "daily", "weekly", "monthly", "as_needed"
- "strength": numeric potency like "500mg" (or blank)
- "dosage": amount like "1 tablet", "10ml" (or blank)
- "duration": like "7 days", "2 weeks" (or blank)
- "instructions": full sig like "Take one tablet twice daily with food" (or blank)
- "confidence": 0-100`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return {
        success: false,
        medicines: [],
        confidence: 0,
        error: `Gemini API error: ${response.status} - ${errText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return {
        success: false,
        medicines: [],
        confidence: 0,
        error: 'No text extracted',
      };
    }

    // Parse JSON (handle wrapped responses)
    let parsed: { medicines?: any[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match)
        return {
          success: false,
          medicines: [],
          confidence: 0,
          error: 'Failed to parse response',
        };
      parsed = JSON.parse(match[0]);
    }

    const raw = Array.isArray(parsed.medicines) ? parsed.medicines : [];

    // Normalize each medicine
    const medicines: Medicine[] = raw.map((m: any) => {
      const name = String(m.name ?? '').trim();
      const strength = String(m.strength ?? '').trim();
      const dosage = String(m.dosage ?? '').trim();
      const duration = String(m.duration ?? '').trim();
      const instructions = String(m.instructions ?? '').trim();

      // Frequency
      const freq = String(m.frequency ?? '').toLowerCase();
      const frequency: Medicine['frequency'] =
        freq === 'weekly'
          ? 'weekly'
          : freq === 'monthly'
            ? 'monthly'
            : freq === 'as_needed' || freq === 'as needed' || freq === 'prn'
              ? 'as_needed'
              : 'daily';

      // Duration → days
      let duration_days: number | null = null;
      const dm = duration.match(
        /(\d+)\s*(day|days|d|week|weeks|w|month|months|m)/i
      );
      if (dm) {
        const n = parseInt(dm[1], 10);
        const u = dm[2].toLowerCase();
        duration_days = u.startsWith('w') ? n * 7 : u.startsWith('m') ? n * 30 : n;
      }

      // Times per day from instructions
      let times_per_day = 1;
      const tpd = instructions.match(/(\d+)\s*(?:times?|x)\s*(?:per\s*)?day/i);
      if (tpd) times_per_day = Math.min(Math.max(parseInt(tpd[1], 10), 1), 6);
      else if (/twice|2\s*(?:times?|x)/i.test(instructions)) times_per_day = 2;
      else if (/three|3\s*(?:times?|x)/i.test(instructions)) times_per_day = 3;
      else if (/four|4\s*(?:times?|x)/i.test(instructions)) times_per_day = 4;

      // Schedule times
      const schedule_times = generateScheduleTimes(times_per_day);

      // Confidence
      const confidence = clamp(
        typeof m.confidence === 'number' ? m.confidence : estimateConfidence(m),
        0,
        100
      );

      return {
        name,
        strength,
        dosage,
        frequency,
        times_per_day,
        schedule_times,
        duration_days,
        instructions: instructions || null,
        confidence,
      };
    });

    // Overall confidence (average, penalized for missing fields)
    const avg =
      medicines.length > 0
        ? medicines.reduce((s, m) => s + m.confidence, 0) / medicines.length
        : 0;
    const missing = medicines.filter((m) => !m.name || !m.strength).length;
    const confidence = clamp(Math.round(avg - missing * 5), 0, 100);

    return { success: true, medicines, confidence };
  } catch (error) {
    console.error('Gemini call error:', error);
    return {
      success: false,
      medicines: [],
      confidence: 0,
      error: String(error),
    };
  }
}

// ===== Helpers =====

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function generateScheduleTimes(timesPerDay: number): string[] {
  const defaults = ['08:00', '14:00', '20:00'];
  const result: string[] = [];
  for (let i = 0; i < timesPerDay; i++) {
    if (i < defaults.length) result.push(defaults[i]);
    else {
      const hour = Math.round(8 + (i * 12) / Math.max(timesPerDay, 1));
      result.push(`${String(hour % 24).padStart(2, '0')}:00`);
    }
  }
  return result;
}

function estimateConfidence(m: any): number {
  let c = 70;
  if (!m.name) c -= 30;
  if (!m.strength) c -= 10;
  if (!m.dosage) c -= 10;
  if (!m.instructions) c -= 5;
  return clamp(c, 0, 100);
}