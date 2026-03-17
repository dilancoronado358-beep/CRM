-- REPAIR SCRIPT V2: usuariosApp Schema Alignment
-- This script aligns the table with the CRM's expected structure based on your screenshot.

-- 1. Ensure RLS is disabled to prevent "silent failures" or permission errors
ALTER TABLE public.usuariosApp DISABLE ROW LEVEL SECURITY;

-- 2. Add missing columns that the CRM expects
DO $$
BEGIN
    -- Column 'creado': Essential for tracking when a user was added
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='creado') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN creado TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Ensure 'whatsappAccess' is present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='whatsappAccess') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN whatsappAccess BOOLEAN DEFAULT false;
    END IF;

    -- Ensure 'area' is present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='area') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN area TEXT;
    END IF;
    
    -- Ensure 'waServerUrl' is present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='waServerUrl') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN waServerUrl TEXT;
    END IF;

    -- Column 'tema': The CRM uses 'tema' to persist theme preference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='tema') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN tema TEXT DEFAULT 'light';
    END IF;
    
    -- Column 'temaActivo': Adding as alias/fallback for compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='temaActivo') THEN
        ALTER TABLE public.usuariosApp ADD COLUMN temaActivo TEXT DEFAULT 'light';
    END IF;
END $$;

-- 3. Clean up potential ID issues
-- If the PK is not set correctly, it might cause upsert issues.
-- Assuming 'id' is already the Primary Key as shown in your screenshot.

-- 4. Enable Realtime
-- This ensures that when you add a user, it shows up on other screens immediately.
-- ALTER PUBLICATION supabase_realtime ADD TABLE usuariosApp; 
