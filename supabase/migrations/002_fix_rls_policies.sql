-- ============================================
-- LumaControl - Fix RLS Policies
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can insert machines" ON machines;
DROP POLICY IF EXISTS "Users can view own machines" ON machines;
DROP POLICY IF EXISTS "Users can update own machines" ON machines;
DROP POLICY IF EXISTS "Users can delete own machines" ON machines;

-- Recreate policies with proper auth checks
-- Allow authenticated users to view their own machines
CREATE POLICY "Users can view own machines" ON machines 
  FOR SELECT USING (auth.uid() = owner_id);

-- Allow authenticated users to insert machines (owner_id must match auth.uid)
CREATE POLICY "Users can insert machines" ON machines 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Allow authenticated users to update their own machines
CREATE POLICY "Users can update own machines" ON machines 
  FOR UPDATE USING (auth.uid() = owner_id);

-- Allow authenticated users to delete their own machines
CREATE POLICY "Users can delete own machines" ON machines 
  FOR DELETE USING (auth.uid() = owner_id);

-- Also fix sensor_readings policies for real-time data
DROP POLICY IF EXISTS "Authenticated users can view sensor_readings" ON sensor_readings;
CREATE POLICY "Authenticated users can view sensor_readings" ON sensor_readings 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Fix machine_commands policies
DROP POLICY IF EXISTS "Authenticated users can view commands" ON machine_commands;
DROP POLICY IF EXISTS "Authenticated users can insert commands" ON machine_commands;
CREATE POLICY "Authenticated users can view commands" ON machine_commands 
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert commands" ON machine_commands 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Fix machine_status policies
DROP POLICY IF EXISTS "Authenticated users can view status" ON machine_status;
CREATE POLICY "Authenticated users can view status" ON machine_status 
  FOR SELECT USING (auth.role() = 'authenticated');
