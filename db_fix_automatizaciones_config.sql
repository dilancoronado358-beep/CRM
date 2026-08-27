-- EJECUTAR ESTO EN EL SQL EDITOR DE SUPABASE
ALTER TABLE automatizaciones ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Esto refresca la caché de la API para que reconozca la nueva columna inmediatamente
NOTIFY pgrst, 'reload schema';
