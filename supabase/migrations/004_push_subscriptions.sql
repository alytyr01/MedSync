-- =============================================
-- MedSync Push Subscriptions for Web Push
-- =============================================

-- Push subscriptions table to store web push subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for push subscriptions
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- =============================================
-- PUSH SUBSCRIPTIONS RLS
-- =============================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own push subscriptions
CREATE POLICY "Users view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own push subscriptions
CREATE POLICY "Users insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own push subscriptions
CREATE POLICY "Users update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own push subscriptions
CREATE POLICY "Users delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- AUTO-ASSIGN USER_ID ON INSERT
-- =============================================
CREATE OR REPLACE FUNCTION set_user_id_push_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_push_subscriptions
  BEFORE INSERT ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_push_subscriptions();

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();