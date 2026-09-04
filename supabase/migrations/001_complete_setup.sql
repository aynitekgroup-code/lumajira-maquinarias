-- ============================================
-- LumaControl - Complete Database Setup (IDEMPOTENTE)
-- Ejecutar TODO de una sola vez en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ELIMINAR OBJETOS EXISTENTES (si existen)
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

DROP POLICY IF EXISTS "Users can view own machines" ON machines;
DROP POLICY IF EXISTS "Users can insert own machines" ON machines;
DROP POLICY IF EXISTS "Users can update own machines" ON machines;
DROP POLICY IF EXISTS "Users can delete own machines" ON machines;

DROP POLICY IF EXISTS "Users can view own sensor_readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users can insert own sensor_readings" ON sensor_readings;

DROP POLICY IF EXISTS "Users can view own commands" ON machine_commands;
DROP POLICY IF EXISTS "Users can insert own commands" ON machine_commands;

DROP POLICY IF EXISTS "Users can view own status" ON machine_status;
DROP POLICY IF EXISTS "Users can upsert own status" ON machine_status;
DROP POLICY IF EXISTS "Users can update own status" ON machine_status;

DROP POLICY IF EXISTS "Authenticated users can view allies" ON allies;

DROP POLICY IF EXISTS "Users can view own ai_usage" ON ai_usage;
DROP POLICY IF EXISTS "Users can insert own ai_usage" ON ai_usage;
DROP POLICY IF EXISTS "Users can update own ai_usage" ON ai_usage;

DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS machine_commands CASCADE;
DROP TABLE IF EXISTS machine_status CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS ai_usage CASCADE;
DROP TABLE IF EXISTS allies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 2. TABLAS
-- ============================================

-- Users table (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'operator',
  fcm_token TEXT,
  notifications_enabled BOOLEAN DEFAULT false,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Machines table
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rtdb_id TEXT,
  image_url TEXT,
  sensors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sensor readings (timestamp as BIGINT epoch ms to match ESP32)
CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  machine_id TEXT,
  current_a FLOAT,
  temperature_c FLOAT,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Machine commands
CREATE TABLE machine_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,
  params JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Machine status
CREATE TABLE machine_status (
  machine_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Allies table
CREATE TABLE allies (
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
CREATE TABLE ai_usage (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_call TIMESTAMPTZ
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX idx_machines_owner ON machines(owner_id);
CREATE INDEX idx_sensor_readings_user ON sensor_readings(user_id, timestamp DESC);
CREATE INDEX idx_sensor_readings_machine ON sensor_readings(machine_id, timestamp DESC);
CREATE INDEX idx_machine_commands_machine ON machine_commands(machine_id, created_at DESC);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE allies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_status ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. POLICIES - USERS
-- ============================================

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 6. POLICIES - MACHINES
-- ============================================

CREATE POLICY "Users can view own machines" ON machines
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own machines" ON machines
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own machines" ON machines
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own machines" ON machines
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================
-- 7. POLICIES - SENSOR READINGS
-- ============================================

CREATE POLICY "Users can view own sensor_readings" ON sensor_readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensor_readings" ON sensor_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. POLICIES - MACHINE COMMANDS
-- ============================================

CREATE POLICY "Users can view own commands" ON machine_commands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commands" ON machine_commands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. POLICIES - MACHINE STATUS
-- ============================================

CREATE POLICY "Users can view own status" ON machine_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own status" ON machine_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status" ON machine_status
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 10. POLICIES - ALLIES
-- ============================================

CREATE POLICY "Authenticated users can view allies" ON allies
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 11. POLICIES - AI USAGE
-- ============================================

CREATE POLICY "Users can view own ai_usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_usage" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_usage" ON ai_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 12. REALTIME (manejo seguro de duplicados)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'sensor_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'machine_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE machine_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'machine_commands'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE machine_commands;
  END IF;
END $$;

-- ============================================
-- 13. TRIGGER - Auto-create user profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
