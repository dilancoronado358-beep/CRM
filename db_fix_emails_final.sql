-- FINAL SCHEMA REPAIR FOR EMAILS
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
    -- 1. Fix columns in 'emails'
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'account_id') THEN
        ALTER TABLE public.emails ADD COLUMN account_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'mensaje_id') THEN
        ALTER TABLE public.emails ADD COLUMN mensaje_id TEXT;
        -- Add unique constraint for upsert
        ALTER TABLE public.emails ADD CONSTRAINT emails_mensaje_id_key UNIQUE (mensaje_id);
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'html') THEN
        ALTER TABLE public.emails ADD COLUMN html TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'contacto_id') THEN
        -- Rename existing camelCase column if it exists, otherwise add it
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'contactoId') THEN
            ALTER TABLE public.emails RENAME COLUMN "contactoId" TO contacto_id;
        ELSE
            ALTER TABLE public.emails ADD COLUMN contacto_id UUID;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'deal_id') THEN
        ALTER TABLE public.emails ADD COLUMN deal_id UUID;
    END IF;

END $$;

-- 2. Ensure RLS allows the service role (backend) to upsert
-- The existing policies should already allow this, but let's make sure.
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- 3. Notify reload
NOTIFY pgrst, 'reload schema';
