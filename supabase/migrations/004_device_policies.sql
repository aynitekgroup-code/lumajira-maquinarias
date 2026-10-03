-- ============================================
-- 004: El ESP32 (clave anon) necesita:
--  1) leer machine_commands (polling de ordenes)
--  2) insertar/actualizar machine_status (estado motores)
-- Ejecutar en Supabase SQL Editor DESPUES de 001-003
-- ============================================

-- Comandos: lectura anonima (el ESP32 filtra por machine_id)
DROP POLICY IF EXISTS "Devices can read commands" ON machine_commands;
CREATE POLICY "Devices can read commands" ON machine_commands
  FOR SELECT USING (auth.role() = 'anon');

-- Estado: upsert anonimo (merge por PK machine_id)
DROP POLICY IF EXISTS "Devices can insert status" ON machine_status;
CREATE POLICY "Devices can insert status" ON machine_status
  FOR INSERT WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "Devices can update status" ON machine_status;
CREATE POLICY "Devices can update status" ON machine_status
  FOR UPDATE USING (auth.role() = 'anon');

-- Verificar
SELECT policyname, cmd FROM pg_policies
WHERE tablename IN ('machine_commands', 'machine_status')
ORDER BY tablename, policyname;
