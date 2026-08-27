-- REPARACIÓN TOTAL DE NOTIFICACIONES (Estructura + RLS + Caché)
-- Ejecuta esto en el SQL Editor de Supabase para solucionar el error de RLS y recarga el CRM.

DO $$ 
BEGIN
    -- 1. Asegurar que la tabla existe con el tipo de ID correcto
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notificaciones') THEN
        CREATE TABLE public.notificaciones (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            usuario_id TEXT,
            titulo TEXT,
            mensaje TEXT,
            tipo TEXT DEFAULT 'info',
            url TEXT,
            leida BOOLEAN DEFAULT false,
            org_id UUID,
            creado TIMESTAMPTZ DEFAULT now()
        );
    END IF;

    -- 2. Asegurar que todas las columnas necesarias existen
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificaciones' AND column_name = 'leida') THEN
        ALTER TABLE public.notificaciones ADD COLUMN leida BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificaciones' AND column_name = 'url') THEN
        ALTER TABLE public.notificaciones ADD COLUMN url TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificaciones' AND column_name = 'tipo') THEN
        ALTER TABLE public.notificaciones ADD COLUMN tipo TEXT DEFAULT 'info';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificaciones' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.notificaciones ADD COLUMN usuario_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificaciones' AND column_name = 'org_id') THEN
        ALTER TABLE public.notificaciones ADD COLUMN org_id UUID;
    END IF;
END $$;

-- 3. REPARACIÓN DE RLS (Políticas de Seguridad)
-- Removemos políticas previas que puedan estar bloqueando
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.notificaciones;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.notificaciones;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.notificaciones;
DROP POLICY IF EXISTS "notificaciones_permisiva" ON public.notificaciones;

-- Aseguramos que RLS esté activo
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Creamos una política que permita TODO a usuarios autenticados
CREATE POLICY "notificaciones_permisiva" 
ON public.notificaciones 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Forzar recarga de caché de API
NOTIFY pgrst, 'reload schema';
