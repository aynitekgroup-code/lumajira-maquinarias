-- ============================================
-- PARTE 3: POLICIES RLS
-- Ejecutar DESPUES de la Parte 2
-- ============================================

-- USERS policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- MACHINES policies
CREATE POLICY "Users can view own machines" ON machines
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own machines" ON machines
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own machines" ON machines
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own machines" ON machines
  FOR DELETE USING (auth.uid() = owner_id);

-- SENSOR READINGS policies
CREATE POLICY "Users can view own sensor_readings" ON sensor_readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensor_readings" ON sensor_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MACHINE COMMANDS policies
CREATE POLICY "Users can view own commands" ON machine_commands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commands" ON machine_commands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MACHINE STATUS policies
CREATE POLICY "Users can view own status" ON machine_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own status" ON machine_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status" ON machine_status
  FOR UPDATE USING (auth.uid() = user_id);

-- ALLIES policies
CREATE POLICY "Authenticated users can view allies" ON allies
  FOR SELECT USING (auth.role() = 'authenticated');

-- AI USAGE policies
CREATE POLICY "Users can view own ai_usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_usage" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_usage" ON ai_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Verificar policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
