-- ============================================
-- PARTE 4: TRIGGER + REALTIME
-- Ejecutar DESPUES de la Parte 3
-- ============================================

-- Trigger function - auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable Realtime (ignorar error si ya existe)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE machine_status;
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE machine_commands;
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
END $$;

-- Verificar trigger
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
