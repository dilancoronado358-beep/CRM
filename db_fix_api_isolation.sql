-- API & WEBHOOKS ISOLATION (FIXED RLS)
-- Ejecuta esto para asegurar que el aislamiento funcione incluso sin re-loguear.

DO $$ 
BEGIN
    -- 1. Asegurar columnas
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_settings' AND column_name = 'org_id') THEN
        ALTER TABLE public.api_settings ADD COLUMN org_id UUID REFERENCES public.organizacion(id);
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'webhook_subscriptions' AND column_name = 'org_id') THEN
        ALTER TABLE public.webhook_subscriptions ADD COLUMN org_id UUID REFERENCES public.organizacion(id);
    END IF;
END $$;

-- 2. Actualizar Políticas RLS (Dinámicas por Tabla de Usuarios)
-- Usamos el email del JWT para buscar la organización actual en la tabla usuariosApp
-- Esto evita depender de los metadatos del JWT que pueden estar obsoletos hasta el próximo login.

DROP POLICY IF EXISTS "api_settings_isolation" ON public.api_settings;
CREATE POLICY "api_settings_isolation" ON public.api_settings 
FOR ALL TO authenticated 
USING (
    org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email')
)
WITH CHECK (
    org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "webhook_subscriptions_isolation" ON public.webhook_subscriptions;
CREATE POLICY "webhook_subscriptions_isolation" ON public.webhook_subscriptions 
FOR ALL TO authenticated 
USING (
    org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email')
)
WITH CHECK (
    org_id IN (SELECT org_id FROM public.usuariosApp WHERE email = auth.jwt() ->> 'email')
);

-- Asegurar RLS activo
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Forzar recarga
NOTIFY pgrst, 'reload schema';
