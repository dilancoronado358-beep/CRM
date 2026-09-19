-- FIX DEFINITIVO: Permisos de eliminación de canales WhatsApp
-- Ejecuta esto en el SQL Editor de Supabase

DO $$
BEGIN

    -- 1. Asegurar que las columnas necesarias existen (Soporte Meta API y nuevo diseño)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'activo') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'provider') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN provider TEXT DEFAULT 'wwebjs';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'meta_token') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN meta_token TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'meta_phone_id') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN meta_phone_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'meta_verify_token') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN meta_verify_token TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'acceso') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN acceso TEXT DEFAULT 'todos';
    END IF;

    -- 2. Habilitar RLS
    ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

    -- 3. Eliminar TODAS las políticas previas para empezar limpio
    DROP POLICY IF EXISTS "Permitir a todos leer whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir a admins insertar whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir a todos insertar whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir acceso a whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir acceso total a usuarios autenticados en whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir Todo Accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "wa_accounts_select" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "wa_accounts_insert" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "wa_accounts_update" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "wa_accounts_delete" ON public.whatsapp_accounts;

    -- 4. Crear política de SELECT: leer todos los canales de la organización
    CREATE POLICY "wa_accounts_select"
    ON public.whatsapp_accounts
    FOR SELECT
    USING (true);

    -- 5. Crear política de INSERT: cualquier usuario autenticado puede crear canales
    CREATE POLICY "wa_accounts_insert"
    ON public.whatsapp_accounts
    FOR INSERT
    WITH CHECK (true);

    -- 6. Crear política de UPDATE: cualquier usuario autenticado puede actualizar
    CREATE POLICY "wa_accounts_update"
    ON public.whatsapp_accounts
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

    -- 7. Crear política de DELETE: cualquier usuario autenticado puede eliminar
    CREATE POLICY "wa_accounts_delete"
    ON public.whatsapp_accounts
    FOR DELETE
    USING (true);

END $$;

-- Verificar que las políticas se crearon
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'whatsapp_accounts';
