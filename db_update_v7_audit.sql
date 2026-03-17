-- AUDIT TRAIL SCHEMA (Phase 41)
-- Execute in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.auditoria (
    id TEXT PRIMARY KEY,
    usuario_id TEXT, -- ID del usuario que realizó el cambio
    usuario_nombre TEXT, -- Nombre para visualización rápida
    entidad_tipo TEXT, -- 'deal', 'contacto', 'empresa', etc.
    entidad_id TEXT, -- ID de la entidad modificada
    campo TEXT, -- Nombre del campo cambiado
    valor_anterior TEXT,
    valor_nuevo TEXT,
    creado TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Política: Todos los autenticados pueden leer, solo el sistema (o admin) inserta.
-- Para simplificar el desarrollo local, permitimos lectura/escritura a autenticados.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditoria') THEN
        CREATE POLICY "Allow all for authenticated" ON public.auditoria FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Habilitar Realtime para auditoría
-- ALTER PUBLICATION supabase_realtime ADD TABLE auditoria;
