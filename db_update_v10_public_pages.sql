-- ================================================================
-- TABLAS PARA LANDING PAGES Y FORMULARIOS PÚBLICOS
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- Tabla para Formularios Públicos (Form Builder)
CREATE TABLE IF NOT EXISTS public.formularios_publicos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    color TEXT DEFAULT '#06B6D4',
    campos JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para Landing Pages públicas
CREATE TABLE IF NOT EXISTS public.landing_pages (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    blocks TEXT[] DEFAULT ARRAY['hero','features','form','cta'],
    hero_title TEXT,
    hero_cta TEXT,
    accent_color TEXT DEFAULT '#06B6D4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar acceso público (necesario para páginas sin sesión)
ALTER TABLE public.formularios_publicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages DISABLE ROW LEVEL SECURITY;

-- Insertar landing page de ejemplo  
INSERT INTO public.landing_pages (id, slug, titulo, activo, blocks, hero_title, hero_cta, accent_color)
VALUES (
    'p1',
    'landing-2026',
    'Campaña Q1 2026',
    true,
    ARRAY['hero','features','form','cta'],
    'Genera más negocios hoy',
    'Ver Demo',
    '#06B6D4'
) ON CONFLICT (id) DO NOTHING;
