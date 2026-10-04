-- ============================================
-- 005: Reforzar policies de dispositivo (anon)
-- El 004 dejaba el upsert en 401/42501. Estas usan rol
-- explicito TO anon y CHECK(true).
-- Ejecutar en Supabase SQL Editor
-- ============================================

DROP POLICY IF EXISTS "Devices can insert status" ON machine_status;
CREATE POLICY "Devices can insert status" ON machine_status
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Devices can update status" ON machine_status;
CREATE POLICY "Devices can update status" ON machine_status
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Devices can read commands" ON machine_commands;
CREATE POLICY "Devices can read commands" ON machine_commands
  FOR SELECT TO anon USING (true);

-- Verificar definiciones completas
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('machine_commands', 'machine_status')
ORDER BY tablename, policyname;
