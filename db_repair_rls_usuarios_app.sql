-- REPAIR SCRIPT V4: Password Column & Case-Sensitivity
-- This script adds the missing 'password' column and ensures case-sensitivity.

-- 1. Ensure RLS is disabled
ALTER TABLE public."usuariosApp" DISABLE ROW LEVEL SECURITY;

-- 2. Add missing columns
DO $$
BEGIN
    -- Column 'password': Required for the CRM's local fallback/record
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='password') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "password" TEXT;
    END IF;

    -- Column 'creado'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='creado') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "creado" TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Column 'whatsappAccess'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='whatsappAccess') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "whatsappAccess" BOOLEAN DEFAULT false;
    END IF;

    -- Column 'area'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='area') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "area" TEXT;
    END IF;
    
    -- Column 'waServerUrl'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='waServerUrl') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "waServerUrl" TEXT;
    END IF;

    -- Column 'tema'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='tema') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "tema" TEXT DEFAULT 'light';
    END IF;
    
    -- Column 'temaActivo'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='temaActivo') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "temaActivo" TEXT DEFAULT 'light';
    END IF;
END $$;
