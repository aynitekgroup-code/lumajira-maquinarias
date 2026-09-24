-- ============================================
-- LumaControl - RLS + seed (UUID real)
-- Ejecutar TODO en Supabase SQL Editor
-- ============================================

-- 1) Perfil de usuario
INSERT INTO public.users (id, name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'name', 'Admin'), email, 'admin'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 2) Política: ESP32 puede insertar
DROP POLICY IF EXISTS "Users can insert own sensor_readings" ON sensor_readings;
DROP POLICY IF EXISTS "Devices can insert sensor_readings" ON sensor_readings;
CREATE POLICY "Devices can insert sensor_readings" ON sensor_readings
  FOR INSERT WITH CHECK (
    auth.role() = 'anon'
    OR auth.uid() = user_id
    OR user_id IS NULL
  );

-- 3) SELECT para el dashboard
DROP POLICY IF EXISTS "Authenticated users can view sensor_readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users can view own sensor_readings" ON sensor_readings;
CREATE POLICY "Authenticated users can view sensor_readings" ON sensor_readings
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4) Machine con UUID real del usuario
INSERT INTO machines (id, name, owner_id, rtdb_id, sensors, created_at)
VALUES (
  'de570528-0f87-4c5b-9548-5d94fac03635',
  'Inyectora JM-80',
  'de570528-0f87-4c5b-9548-5d94fac03635',
  'de570528-0f87-4c5b-9548-5d94fac03635',
  '[{"type":"SCT-013","name":"Corriente Resistencias Banda","unit":"A"}]'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rtdb_id = EXCLUDED.rtdb_id,
  owner_id = EXCLUDED.owner_id;

-- 5) Realtime (ignora si ya existe)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Verificar
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'sensor_readings' ORDER BY policyname;
SELECT id, name, owner_id, rtdb_id FROM machines;
