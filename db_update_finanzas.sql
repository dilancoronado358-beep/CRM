-- FINANCIAL CONTROL SCHEMA (Phase 39)
-- Execute in Supabase SQL Editor

-- 1. Gastos por Deal
CREATE TABLE IF NOT EXISTS public.finanzas_gastos (
    id TEXT PRIMARY KEY,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE CASCADE,
    categoria TEXT, -- Publicidad, Viáticos, Software, Otros
    descripcion TEXT,
    monto NUMERIC NOT NULL DEFAULT 0,
    fecha DATE DEFAULT CURRENT_DATE,
    creado_por TEXT,
    creado TIMESTAMPTZ DEFAULT now()
);

-- 2. Comisiones de Ventas
CREATE TABLE IF NOT EXISTS public.finanzas_comisiones (
    id TEXT PRIMARY KEY,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE CASCADE,
    vendedor_id TEXT, -- ID del usuarioApp
    monto NUMERIC NOT NULL DEFAULT 0,
    porcentaje NUMERIC, -- Porcentaje aplicado
    status TEXT DEFAULT 'pendiente', -- pendiente, pagado, cancelado
    fecha_liquidacion DATE,
    creado TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finanzas_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzas_comisiones ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Generation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finanzas_gastos') THEN
        CREATE POLICY "Allow all for authenticated users" ON public.finanzas_gastos FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finanzas_comisiones') THEN
        CREATE POLICY "Allow all for authenticated users" ON public.finanzas_comisiones FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
