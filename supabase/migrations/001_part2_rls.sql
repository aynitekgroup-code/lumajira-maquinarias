-- ============================================
-- PARTE 2: INDEXES Y ROW LEVEL SECURITY
-- Ejecutar DESPUES de la Parte 1
-- ============================================

-- Indexes
CREATE INDEX idx_machines_owner ON machines(owner_id);
CREATE INDEX idx_sensor_readings_user ON sensor_readings(user_id, timestamp DESC);
CREATE INDEX idx_sensor_readings_machine ON sensor_readings(machine_id, timestamp DESC);
CREATE INDEX idx_machine_commands_machine ON machine_commands(machine_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE allies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_status ENABLE ROW LEVEL SECURITY;

-- Verificar que RLS esta habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
