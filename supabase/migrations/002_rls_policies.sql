-- =============================================
-- MedSync Row Level Security Policies
-- =============================================

-- =============================================
-- MEDICINES RLS
-- =============================================
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

-- Users can view their own medicines
CREATE POLICY "Users view own medicines"
  ON medicines FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own medicines
CREATE POLICY "Users insert own medicines"
  ON medicines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own medicines
CREATE POLICY "Users update own medicines"
  ON medicines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own medicines
CREATE POLICY "Users delete own medicines"
  ON medicines FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- MEDICATION LOGS RLS
-- =============================================
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users view own logs"
  ON medication_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users insert own logs"
  ON medication_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own logs
CREATE POLICY "Users update own logs"
  ON medication_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own logs
CREATE POLICY "Users delete own logs"
  ON medication_logs FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- INVENTORY RLS
-- =============================================
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Users can view their own inventory
CREATE POLICY "Users view own inventory"
  ON inventory FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own inventory
CREATE POLICY "Users insert own inventory"
  ON inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own inventory
CREATE POLICY "Users update own inventory"
  ON inventory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own inventory
CREATE POLICY "Users delete own inventory"
  ON inventory FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- EMERGENCY CONTACTS RLS
-- =============================================
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Users can view their own contacts
CREATE POLICY "Users view own contacts"
  ON emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own contacts
CREATE POLICY "Users insert own contacts"
  ON emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users update own contacts"
  ON emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own contacts
CREATE POLICY "Users delete own contacts"
  ON emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- AUTO-ASSIGN USER_ID ON INSERT
-- =============================================

-- Medicines: force user_id to auth.uid()
CREATE OR REPLACE FUNCTION set_user_id_medicines()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_medicines
  BEFORE INSERT ON medicines
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_medicines();

-- Medication logs: force user_id to auth.uid()
CREATE OR REPLACE FUNCTION set_user_id_medication_logs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_medication_logs
  BEFORE INSERT ON medication_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_medication_logs();

-- Inventory: force user_id to auth.uid()
CREATE OR REPLACE FUNCTION set_user_id_inventory()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_inventory
  BEFORE INSERT ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_inventory();

-- Emergency contacts: force user_id to auth.uid()
CREATE OR REPLACE FUNCTION set_user_id_emergency_contacts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_emergency_contacts
  BEFORE INSERT ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_emergency_contacts();

-- =============================================
-- INVENTORY AUTO-CREATE ON MEDICINE INSERT
-- =============================================
CREATE OR REPLACE FUNCTION create_inventory_for_medicine()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (user_id, medicine_id)
  VALUES (NEW.user_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_inventory_for_medicine
  AFTER INSERT ON medicines
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_for_medicine();