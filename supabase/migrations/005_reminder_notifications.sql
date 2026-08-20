-- MedSync Web Push Reminder Notifications
CREATE TABLE reminder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  time_key TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  snoozed_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminder_notifications_due
  ON reminder_notifications(scheduled_for)
  WHERE sent_at IS NULL;

CREATE INDEX idx_reminder_notifications_user
  ON reminder_notifications(user_id);

CREATE INDEX idx_reminder_notifications_medicine
  ON reminder_notifications(medicine_id);

ALTER TABLE reminder_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reminder notifications"
  ON reminder_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reminder notifications"
  ON reminder_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reminder notifications"
  ON reminder_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_user_id_reminder_notifications()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_reminder_notifications
  BEFORE INSERT ON reminder_notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_reminder_notifications();

CREATE TRIGGER update_reminder_notifications_updated_at
  BEFORE UPDATE ON reminder_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();