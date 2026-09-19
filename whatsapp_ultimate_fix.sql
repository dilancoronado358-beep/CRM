-- ULTIMATE FIX PARA WHATSAPP CRM
-- Ejecutar en el SQL Editor de Supabase (este archivo reemplaza a todos los anteriores)

DO $$
BEGIN

    -------------------------------------------------------------------------
    -- 1. WHATSAPP_MESSAGES
    -------------------------------------------------------------------------
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'account_id') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN account_id UUID;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'org_id') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN org_id TEXT REFERENCES public.organizacion(id) DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'contact_name') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN contact_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'contact_number') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN contact_number TEXT;
    END IF;

    -------------------------------------------------------------------------
    -- 2. WHATSAPP_ACCOUNTS
    -------------------------------------------------------------------------
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'numero') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN numero TEXT;
    END IF;

    -------------------------------------------------------------------------
    -- 3. POLITICAS RLS (Quitar bloqueos para que el Backend pueda insertar)
    -------------------------------------------------------------------------
    ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mensajes_select" ON public.whatsapp_messages;
    DROP POLICY IF EXISTS "mensajes_insert" ON public.whatsapp_messages;
    DROP POLICY IF EXISTS "mensajes_update" ON public.whatsapp_messages;
    DROP POLICY IF EXISTS "mensajes_delete" ON public.whatsapp_messages;

    CREATE POLICY "mensajes_select" ON public.whatsapp_messages FOR SELECT USING (true);
    CREATE POLICY "mensajes_insert" ON public.whatsapp_messages FOR INSERT WITH CHECK (true);
    CREATE POLICY "mensajes_update" ON public.whatsapp_messages FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "mensajes_delete" ON public.whatsapp_messages FOR DELETE USING (true);

    ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "wa_accounts_insert" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "wa_accounts_update" ON public.whatsapp_accounts;
    
    CREATE POLICY "wa_accounts_insert" ON public.whatsapp_accounts FOR INSERT WITH CHECK (true);
    CREATE POLICY "wa_accounts_update" ON public.whatsapp_accounts FOR UPDATE USING (true) WITH CHECK (true);

    -------------------------------------------------------------------------
    -- 4. FORZAR RECARGA DE CACHÉ
    -------------------------------------------------------------------------
    NOTIFY pgrst, 'reload schema';

END $$;
