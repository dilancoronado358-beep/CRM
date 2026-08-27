-- FIX WHATSAPP PERSISTENCE
-- Ejecutar este script en el Editor SQL de Supabase para corregir los nombres de las columnas.

DO $$
BEGIN
    -- Asegurar que la tabla existe con el esquema correcto
    CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        body TEXT,
        from_me BOOLEAN NOT NULL DEFAULT false,
        timestamp BIGINT,
        ack INTEGER DEFAULT 0,
        has_media BOOLEAN DEFAULT false,
        file_name TEXT,
        mime_type TEXT,
        deal_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Renombrar chatid a chat_id si existe el nombre viejo
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='chatid') THEN
        ALTER TABLE public.whatsapp_messages RENAME COLUMN chatid TO chat_id;
    END IF;

    -- Asegurar que deal_id existe (snake_case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='deal_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='dealid') THEN
            ALTER TABLE public.whatsapp_messages RENAME COLUMN dealid TO deal_id;
        ELSE
            ALTER TABLE public.whatsapp_messages ADD COLUMN deal_id TEXT;
        END IF;
    END IF;

    -- Asegurar que from_me existe (snake_case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='from_me') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='fromme') THEN
            ALTER TABLE public.whatsapp_messages RENAME COLUMN fromme TO from_me;
        ELSE
            ALTER TABLE public.whatsapp_messages ADD COLUMN from_me BOOLEAN DEFAULT false;
        END IF;
    END IF;

    -- Asegurar que has_media existe (snake_case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='has_media') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='hasmedia') THEN
            ALTER TABLE public.whatsapp_messages RENAME COLUMN hasmedia TO has_media;
        ELSE
            ALTER TABLE public.whatsapp_messages ADD COLUMN has_media BOOLEAN DEFAULT false;
        END IF;
    END IF;

    -- Asegurar que file_name existe (snake_case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='file_name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='filename') THEN
            ALTER TABLE public.whatsapp_messages RENAME COLUMN filename TO file_name;
        ELSE
            ALTER TABLE public.whatsapp_messages ADD COLUMN file_name TEXT;
        END IF;
    END IF;

END $$;
