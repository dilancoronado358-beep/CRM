-- ================================================================
-- ACTUALIZACIÓN DE TABLAS PARA LANDING PAGES Y FORMULARIOS
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- 1. Crear las tablas si no existen
CREATE TABLE IF NOT EXISTS public.formularios_publicos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    color TEXT DEFAULT '#06B6D4',
    campos JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.landing_pages (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    hero_title TEXT,
    hero_cta TEXT,
    accent_color TEXT DEFAULT '#06B6D4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Deshabilitar RLS (acceso público sin login)
ALTER TABLE public.formularios_publicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages DISABLE ROW LEVEL SECURITY;

-- 3. Agregar columnas faltantes en formularios_publicos
ALTER TABLE public.formularios_publicos ADD COLUMN IF NOT EXISTS apariencia JSONB DEFAULT '{}';
ALTER TABLE public.formularios_publicos ADD COLUMN IF NOT EXISTS pipeline_id TEXT;

-- 4. Agregar columnas faltantes en landing_pages
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS hero_sub TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS hero_cta2 TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS hero_cta_url TEXT DEFAULT '#form-section';
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS hero_cta2_url TEXT DEFAULT '#pricing';
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]';
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS stats_items JSONB DEFAULT '[]';
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]';
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]';
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS cta_title TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS cta_sub TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS cta_btn TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS cta_btn_url TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS custom_text TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS floating_elements JSONB DEFAULT '[]';

-- 5. Convertir columna blocks de TEXT[] a JSONB
--    (Hay que eliminar el DEFAULT primero, luego cambiar tipo, luego poner nuevo DEFAULT)
DO $$
DECLARE
  col_type text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'landing_pages'
      AND column_name = 'blocks'
  ) THEN
    -- Obtenemos el tipo actual de la columna
    SELECT data_type INTO col_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landing_pages' AND column_name = 'blocks';

    IF col_type = 'ARRAY' THEN
      -- Quitar el default anterior
      ALTER TABLE public.landing_pages ALTER COLUMN blocks DROP DEFAULT;
      -- Cambiar tipo a JSONB usando conversión explícita desde ARRAY de texto
      ALTER TABLE public.landing_pages
        ALTER COLUMN blocks TYPE JSONB USING to_jsonb(blocks::text[]);
      -- Poner el nuevo default en JSONB
      ALTER TABLE public.landing_pages
        ALTER COLUMN blocks SET DEFAULT '["hero","features","cta"]'::jsonb;
    ELSIF col_type = 'jsonb' THEN
      -- Solo actualizar el default si ya es jsonb
      ALTER TABLE public.landing_pages ALTER COLUMN blocks DROP DEFAULT;
      ALTER TABLE public.landing_pages ALTER COLUMN blocks SET DEFAULT '["hero","features","cta"]'::jsonb;
    END IF;
  ELSE
    -- Si no existe la columna, crearla directamente como JSONB
    ALTER TABLE public.landing_pages
      ADD COLUMN blocks JSONB DEFAULT '["hero","features","cta"]'::jsonb;
  END IF;
END $$;

-- 6. Insertar landing page de ejemplo
INSERT INTO public.landing_pages (id, slug, titulo, activo, blocks, hero_title, hero_cta, accent_color)
VALUES (
    'p1',
    'landing-2026',
    'Campaña Q1 2026',
    true,
    '["hero","features","cta"]'::jsonb,
    'Genera más negocios hoy',
    'Ver Demo',
    '#06B6D4'
) ON CONFLICT (id) DO NOTHING;
