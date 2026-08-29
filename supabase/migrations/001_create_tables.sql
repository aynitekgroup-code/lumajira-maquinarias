-- ============================================
-- LumaControl - Supabase Schema
-- ============================================

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'operator',
  fcm_token TEXT,
  notifications_enabled BOOLEAN DEFAULT false,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, 'operator');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rtdb_id TEXT,
  image_url TEXT,
  sensors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Allies table
CREATE TABLE IF NOT EXISTS allies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  position TEXT,
  company TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI usage rate limiting
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_call TIMESTAMPTZ
);

-- Sensor readings (replaces Firebase RTDB sensors/)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id TEXT NOT NULL,
  current_a FLOAT,
  temperature_c FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Machine commands (replaces Firebase RTDB machines/{id}/commands)
CREATE TABLE IF NOT EXISTS machine_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id TEXT NOT NULL,
  type TEXT,
  params JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Machine status (replaces Firebase RTDB machines/{id}/status)
CREATE TABLE IF NOT EXISTS machine_status (
  machine_id TEXT PRIMARY KEY,
  status JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_machines_owner ON machines(owner_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_machine ON sensor_readings(machine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_machine_commands_machine ON machine_commands(machine_id, created_at DESC);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE allies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_status ENABLE ROW LEVEL SECURITY;

-- Users: read/write own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Machines: owner CRUD + any authenticated can create
CREATE POLICY "Users can view own machines" ON machines FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert machines" ON machines FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own machines" ON machines FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own machines" ON machines FOR DELETE USING (auth.uid() = owner_id);

-- Allies: read for authenticated, write for admin only
CREATE POLICY "Authenticated users can view allies" ON allies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage allies" ON allies FOR ALL USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- AI usage: user-scoped
CREATE POLICY "Users can view own ai_usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_usage" ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_usage" ON ai_usage FOR UPDATE USING (auth.uid() = user_id);

-- Sensor readings: authenticated read, ESP32 writes via service role
CREATE POLICY "Authenticated users can view sensor_readings" ON sensor_readings FOR SELECT USING (auth.role() = 'authenticated');

-- Machine commands: authenticated read/write
CREATE POLICY "Authenticated users can view commands" ON machine_commands FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert commands" ON machine_commands FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Machine status: authenticated read, ESP32 writes via service role
CREATE POLICY "Authenticated users can view status" ON machine_status FOR SELECT USING (auth.role() = 'authenticated');

-- Enable Realtime for sensor data and machine status
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE machine_status;
ALTER PUBLICATION supabase_realtime ADD TABLE machine_commands;
