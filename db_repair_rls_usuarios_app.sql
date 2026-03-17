-- REPAIR SCRIPT: usuariosApp Permissions & Schema
-- If the table exists but data isn't saving, it's likely due to RLS.

-- 1. Disable RLS to allow the system to write freely for now
-- This is often the quickest fix when a table exists but won't accept new data.
ALTER TABLE public.usuariosApp DISABLE ROW LEVEL SECURITY;

-- 2. Verify and add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='waServerUrl') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN waServerUrl TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='tema') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN tema TEXT DEFAULT 'light';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='whatsappAccess') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN whatsappAccess BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Enable Realtime (Optional)
-- This allows other team members to see new users immediately without refreshing.
-- ALTER PUBLICATION supabase_realtime ADD TABLE usuariosApp;
