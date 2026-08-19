-- =============================================
-- MedSync Initial Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- MEDICINES TABLE
-- =============================================
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'as_needed')),
  times_per_day INTEGER NOT NULL DEFAULT 1 CHECK (times_per_day > 0),
  schedule_times TEXT[] NOT NULL DEFAULT '{}',
  duration_days INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for medicines
CREATE INDEX idx_medicines_user_id ON medicines(user_id);
CREATE INDEX idx_medicines_start_date ON medicines(start_date);
CREATE INDEX idx_medicines_user_start ON medicines(user_id, start_date);

-- =============================================
-- MEDICATION LOGS TABLE
-- =============================================
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('taken', 'skipped', 'snoozed', 'missed', 'pending')),
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for medication logs
CREATE INDEX idx_medication_logs_user_id ON medication_logs(user_id);
CREATE INDEX idx_medication_logs_medicine_id ON medication_logs(medicine_id);
CREATE INDEX idx_medication_logs_scheduled_time ON medication_logs(scheduled_time);
CREATE INDEX idx_medication_logs_user_status ON medication_logs(user_id, status);
CREATE INDEX idx_medication_logs_user_date ON medication_logs(user_id, scheduled_time);

-- =============================================
-- INVENTORY TABLE
-- =============================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  remaining_quantity INTEGER NOT NULL DEFAULT 0 CHECK (remaining_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  refill_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  last_refilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medicine_id)
);

-- Indexes for inventory
CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_inventory_medicine_id ON inventory(medicine_id);
CREATE INDEX idx_inventory_low_stock ON inventory(user_id, remaining_quantity, low_stock_threshold);

-- =============================================
-- EMERGENCY CONTACTS TABLE
-- =============================================
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for emergency contacts
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_emergency_contacts_user_primary ON emergency_contacts(user_id, is_primary);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON medicines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();