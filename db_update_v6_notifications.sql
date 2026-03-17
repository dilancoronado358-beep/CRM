-- NOTIFICATIONS & DATA HYGIENE SCHEMA (Phase 40)
-- Execute in Supabase SQL Editor

-- 1. Tabla de Notificaciones Reales
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id TEXT PRIMARY KEY,
    usuario_id TEXT, -- ID del usuario que recibe
    titulo TEXT,
    mensaje TEXT,
    tipo TEXT DEFAULT 'info', -- info, success, warning, danger
    url TEXT, -- Link interno para navegar al hacer clic
    leida BOOLEAN DEFAULT false,
    creado TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Política Permisiva (Ajustar en producción para filtrar por usuario_id)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones') THEN
        CREATE POLICY "Allow all for authenticated" ON public.notificaciones FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 2. Asegurar que Realtime esté habilitado para esta tabla
-- Nota: Esto se suele hacer desde la UI de Supabase, pero aquí dejamos la intención.
-- ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
