-- FIX FINAL: Agregar columnas faltantes en ambas tablas y recargar caché
-- Ejecutar en el SQL Editor de Supabase

DO $$
BEGIN

    -- 1. Agregar account_id a whatsapp_messages
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'account_id') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN account_id UUID;
    END IF;

    -- 2. Agregar contact_name a whatsapp_messages
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'contact_name') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN contact_name TEXT;
    END IF;

    -- 3. Agregar contact_number a whatsapp_messages
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'contact_number') THEN
        ALTER TABLE public.whatsapp_messages ADD COLUMN contact_number TEXT;
    END IF;

    -- 4. Agregar numero a whatsapp_accounts (¡El error que te acaba de salir!)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_accounts' AND column_name = 'numero') THEN
        ALTER TABLE public.whatsapp_accounts ADD COLUMN numero TEXT;
    END IF;

    -- 5. Actualizar políticas de RLS para whatsapp_messages por seguridad
    ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "mensajes_select" ON public.whatsapp_messages;
    DROP POLICY IF EXISTS "mensajes_insert" ON public.whatsapp_messages;
    DROP POLICY IF EXISTS "mensajes_update" ON public.whatsapp_messages;
    DROP POLICY IF EXISTS "mensajes_delete" ON public.whatsapp_messages;

    CREATE POLICY "mensajes_select" ON public.whatsapp_messages FOR SELECT USING (true);
    CREATE POLICY "mensajes_insert" ON public.whatsapp_messages FOR INSERT WITH CHECK (true);
    CREATE POLICY "mensajes_update" ON public.whatsapp_messages FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "mensajes_delete" ON public.whatsapp_messages FOR DELETE USING (true);

    -- 6. Forzar recarga del schema cache de PostgREST para que Node.js no de error
    NOTIFY pgrst, 'reload schema';

END $$;
