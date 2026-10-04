-- ============================================
-- 006: El upsert (INSERT ... ON CONFLICT DO UPDATE) exige
-- permiso SELECT sobre la fila en conflicto. Sin SELECT para
-- anon, el upsert falla con 42501 aunque INSERT/UPDATE pasen.
-- Ejecutar en Supabase SQL Editor
-- ============================================

DROP POLICY IF EXISTS "Devices can read status" ON machine_status;
CREATE POLICY "Devices can read status" ON machine_status
  FOR SELECT TO anon USING (true);

-- Limpieza de fila de prueba
DELETE FROM machine_status WHERE machine_id = 'test-borrador';

-- Verificar
SELECT policyname, roles, cmd FROM pg_policies
WHERE tablename = 'machine_status'
ORDER BY policyname;
