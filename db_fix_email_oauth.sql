-- PHASE 43: OAUTH EMAIL & CALENDAR INTEGRATION
-- Ejecuta esto en el SQL Editor de Supabase.

DO $$ 
BEGIN
    -- 1. Agregar columnas de OAuth a email_accounts si no existen
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'access_token') THEN
        ALTER TABLE public.email_accounts ADD COLUMN access_token TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'refresh_token') THEN
        ALTER TABLE public.email_accounts ADD COLUMN refresh_token TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'expires_at') THEN
        ALTER TABLE public.email_accounts ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'sync_calendar') THEN
        ALTER TABLE public.email_accounts ADD COLUMN sync_calendar BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'org_id') THEN
        ALTER TABLE public.email_accounts ADD COLUMN org_id UUID REFERENCES public.organizacion(id);
    END IF;

    -- 1.1 Agregar columnas a emails
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'user_id') THEN
        ALTER TABLE public.emails ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'org_id') THEN
        ALTER TABLE public.emails ADD COLUMN org_id UUID REFERENCES public.organizacion(id);
    END IF;
END $$;

-- 2. Asegurar RLS (Permitir que el usuario gestione sus propias cuentas)
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_accounts_owner_policy" ON public.email_accounts;
CREATE POLICY "email_accounts_owner_policy" ON public.email_accounts 
FOR ALL TO authenticated 
USING (user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email'))
WITH CHECK (user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email'));

-- 2.1 RLS para emails
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emails_owner_policy" ON public.emails;
CREATE POLICY "emails_owner_policy" ON public.emails 
FOR ALL TO authenticated 
USING (user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email'))
WITH CHECK (user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email'));

-- 3. Notificar recarga
NOTIFY pgrst, 'reload schema';
