-- API & WEBHOOKS SCHEMA (Phase 42)
-- Execute in Supabase SQL Editor

-- Table for Global API Settings (Tokens)
CREATE TABLE IF NOT EXISTS public.api_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    api_token TEXT NOT NULL,
    creado TIMESTAMPTZ DEFAULT now(),
    ultimo_uso TIMESTAMPTZ
);

-- Table for Webhook Subscriptions
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    evento TEXT NOT NULL, -- e.g., 'deal.ganado', 'lead.nuevo'
    activo BOOLEAN DEFAULT true,
    creado TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Initial API Token generation if not exists
INSERT INTO public.api_settings (id, api_token)
VALUES ('global_config', 'sk_dev_' || encode(gen_random_bytes(16), 'hex'))
ON CONFLICT (id) DO NOTHING;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_settings') THEN
        CREATE POLICY "Allow all for authenticated" ON public.api_settings FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_subscriptions') THEN
        CREATE POLICY "Allow all for authenticated" ON public.webhook_subscriptions FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
