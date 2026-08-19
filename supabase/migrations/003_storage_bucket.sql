-- =============================================
-- MedSync Storage Bucket for Prescriptions
-- =============================================

-- Create prescriptions storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescriptions',
  'prescriptions',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

-- Users can upload their own prescription images
CREATE POLICY "Users upload own prescriptions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prescriptions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own prescription images
CREATE POLICY "Users view own prescriptions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'prescriptions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own prescription images
CREATE POLICY "Users delete own prescriptions"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'prescriptions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );