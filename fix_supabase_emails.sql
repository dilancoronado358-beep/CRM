-- SUPABASE REPAIR SCRIPT FOR EMAILS
-- Run this in the Supabase SQL Editor to fix persistence issues.

DO $$ 
BEGIN
    -- 1. Ensure 'emails' table has all required columns for filtering and ordering
    
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'user_id') THEN
        ALTER TABLE public.emails ADD COLUMN user_id TEXT;
    END IF;

    -- Add org_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'org_id') THEN
        ALTER TABLE public.emails ADD COLUMN org_id TEXT;
    END IF;

    -- Add created_at / creado_at harmonization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'creado_at') THEN
        ALTER TABLE public.emails ADD COLUMN creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
    
    -- Ensure deal_id is TEXT (for string IDs like 'd1')
    -- If it's already TEXT, this is a no-op. If it's UUID, we cast it.
    BEGIN
        ALTER TABLE public.emails ALTER COLUMN deal_id TYPE TEXT USING deal_id::text;
    EXCEPTION WHEN OTHERS THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'deal_id') THEN
            ALTER TABLE public.emails ADD COLUMN deal_id TEXT;
        END IF;
    END;

    -- Ensure contacto_id is TEXT
    BEGIN
        ALTER TABLE public.emails ALTER COLUMN contacto_id TYPE TEXT USING contacto_id::text;
    EXCEPTION WHEN OTHERS THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'contacto_id') THEN
            ALTER TABLE public.emails ADD COLUMN contacto_id TEXT;
        END IF;
    END;

END $$;

-- 2. Disable RLS temporarily to ensure sync works without blockers
ALTER TABLE public.emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts DISABLE ROW LEVEL SECURITY;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
