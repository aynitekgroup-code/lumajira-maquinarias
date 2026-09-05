-- ============================================
-- PARTE 1: CREAR TABLAS
-- Ejecutar ESTO PRIMERO
-- ============================================

-- Eliminar tablas si existen
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS machine_commands CASCADE;
DROP TABLE IF EXISTS machine_status CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS ai_usage CASCADE;
DROP TABLE IF EXISTS allies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
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

-- Sensor readings
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

-- AI usage
CREATE TABLE ai_usage (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_call TIMESTAMPTZ
);

-- Verificar que las tablas se crearon
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
