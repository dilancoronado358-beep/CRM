-- MEGA REPARACIÓN DE TABLA AUTOMATIZACIONES
-- Ejecuta esto en el SQL Editor de Supabase

DO $$ 
BEGIN
    -- Asegurar que la tabla existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automatizaciones') THEN
        CREATE TABLE public.automatizaciones (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre TEXT,
            etapa_id TEXT,
            pipeline_id TEXT,
            org_id UUID,
            tipo TEXT,
            activo BOOLEAN DEFAULT true,
            config JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;

    -- Asegurar que todas las columnas necesarias existen (por si la tabla ya existía pero incompleta)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'automatizaciones' AND column_name = 'config') THEN
        ALTER TABLE public.automatizaciones ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'automatizaciones' AND column_name = 'etapa_id') THEN
        ALTER TABLE public.automatizaciones ADD COLUMN etapa_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'automatizaciones' AND column_name = 'pipeline_id') THEN
        ALTER TABLE public.automatizaciones ADD COLUMN pipeline_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'automatizaciones' AND column_name = 'org_id') THEN
        ALTER TABLE public.automatizaciones ADD COLUMN org_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'automatizaciones' AND column_name = 'tipo') THEN
        ALTER TABLE public.automatizaciones ADD COLUMN tipo TEXT;
    END IF;

END $$;

-- FORZAR RECARGA DE CACHÉ DE API
NOTIFY pgrst, 'reload schema';
