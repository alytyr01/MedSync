# MedSync Supabase Setup Guide

## 1. Database Migrations

Run these SQL files in order in the Supabase SQL Editor:

1. `migrations/001_initial_schema.sql` - Creates all tables
2. `migrations/002_rls_policies.sql` - Row Level Security policies
3. `migrations/003_storage_bucket.sql` - Storage bucket for prescriptions

## 2. Edge Function Setup

### Deploy the Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref kcjnwhxuacmjwpyekvjb

# Deploy the scan-prescription function
supabase functions deploy scan-prescription
```

### Set Environment Variables

Set these secrets in the Supabase Dashboard:
**Project Settings → Edge Functions → Secrets**

```
CLOUD_VISION_API_KEY=AIzaSyAYAItgau_QfMJKbOFLnlMYHZgkQvuC2f8
GEMINI_API_KEY=AIzaSyBAHnTgCUtGRyOmHd__NufSQ_SEjz4ngSo
```

Or via CLI:
```bash
supabase secrets set CLOUD_VISION_API_KEY=AIzaSyAYAItgau_QfMJKbOFLnlMYHZgkQvuC2f8
supabase secrets set GEMINI_API_KEY=AIzaSyBAHnTgCUtGRyOmHd__NufSQ_SEjz4ngSo
```

## 3. Architecture

```
Camera
  │
  ▼
Upload Image
  │
  ▼
Supabase Storage (prescriptions bucket)
  │
  ▼
Supabase Edge Function (scan-prescription)
  │
  ▼
Google Cloud Vision API (OCR text extraction)
  │
  ▼
Gemini (Structured medicine extraction)
  │
  ▼
Structured Medicines
  │
  ▼
Return to React
```

## 4. Security

- **API keys are server-side only** - Cloud Vision and Gemini keys are stored as Edge Function secrets
- **JWT verification** - Edge function requires authenticated Supabase user
- **Storage RLS** - Users can only access their own prescription images
- **Auto-cleanup** - Images are deleted from storage after processing

## 5. Local Development

For local testing without the edge function, the app falls back to mock data automatically.