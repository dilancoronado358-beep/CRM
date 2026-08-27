-- MASTER SQL UPDATE: ENTERPRISE SUITE (V5)
-- Execute this script in your Supabase SQL Editor

-- 1. Ensure usuariosApp has the tema column
ALTER TABLE public.usuariosApp ADD COLUMN IF NOT EXISTS tema TEXT DEFAULT 'dark';

-- 2. Phase 34: Cotizaciones (Quotes)
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id TEXT PRIMARY KEY,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE CASCADE,
    cliente_id TEXT,
    vendedor_id TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    iva NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    creado TIMESTAMPTZ DEFAULT now(),
    notas TEXT,
    status TEXT DEFAULT 'borrador'
);

-- 3. Phase 35: Sales Playbook (Wiki)
CREATE TABLE IF NOT EXISTS public.sales_playbook (
    id TEXT PRIMARY KEY,
    titulo TEXT,
    contenido TEXT,
    categoria TEXT,
    creado TIMESTAMPTZ DEFAULT now(),
    autor_id TEXT
);

-- 4. Phase 36: Drip Marketing (Secuencias)
CREATE TABLE IF NOT EXISTS public.email_sequences (
    id TEXT PRIMARY KEY,
    nombre TEXT,
    descripcion TEXT,
    pasos JSONB DEFAULT '[]'::jsonb,
    activa BOOLEAN DEFAULT true,
    creado TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_sequence_subscriptions (
    id TEXT PRIMARY KEY,
    sequence_id TEXT REFERENCES public.email_sequences(id) ON DELETE CASCADE,
    contacto_id TEXT,
    email TEXT,
    status TEXT DEFAULT 'activo',
    paso_actual INTEGER DEFAULT 0,
    creado TIMESTAMPTZ DEFAULT now(),
    ultima_ejecucion TIMESTAMPTZ
);

-- 5. Phase 37: Reportes Personalizados (Custom Reports)
CREATE TABLE IF NOT EXISTS public.custom_reports (
    id TEXT PRIMARY KEY,
    nombre TEXT,
    configuracion JSONB,
    creado TIMESTAMPTZ DEFAULT now(),
    autor_id TEXT
);

-- Enable RLS (Security) - Optional but recommended
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_playbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for the existing CRM flow (adjust as needed for strict production)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cotizaciones') THEN
        CREATE POLICY "Allow all for authenticated" ON public.cotizaciones FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    -- Repeat for others if necessary...
END $$;
