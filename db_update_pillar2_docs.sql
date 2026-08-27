-- ==========================================
-- PILAR 2: GESTIÓN DOCUMENTAL Y FIRMA DIGITAL
-- ==========================================

-- 1. Actualizar tabla documentos para soportar firmas y contratos
DO $$ 
BEGIN
    -- Añadir columnas si no existen
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'token_firma') THEN
        ALTER TABLE public.documentos ADD COLUMN token_firma TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'firmado') THEN
        ALTER TABLE public.documentos ADD COLUMN firmado BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'datos_firma') THEN
        ALTER TABLE public.documentos ADD COLUMN datos_firma TEXT; -- Almacena Base64 o SVG de la firma
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'fecha_firma') THEN
        ALTER TABLE public.documentos ADD COLUMN fecha_firma TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'tipo') THEN
        ALTER TABLE public.documentos ADD COLUMN tipo TEXT DEFAULT 'archivo'; -- 'archivo' o 'contrato'
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'cuerpo_contrato') THEN
        ALTER TABLE public.documentos ADD COLUMN cuerpo_contrato TEXT;
    END IF;
     IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'deal_id') THEN
        ALTER TABLE public.documentos ADD COLUMN deal_id TEXT;
    END IF;
END $$;

-- 2. Crear tabla para plantillas de documentos/contratos
CREATE TABLE IF NOT EXISTS public.documentos_plantillas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cuerpo TEXT NOT NULL, -- Soporta variables como {nombre}, {valor_negocio}
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    org_id UUID
);

-- Asegurar RLS desactivado o políticas abiertas para desarrollo
ALTER TABLE public.documentos_plantillas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Políticas CRM Plantillas Doc" ON public.documentos_plantillas;
CREATE POLICY "Políticas CRM Plantillas Doc" ON public.documentos_plantillas FOR ALL USING (true) WITH CHECK (true);

-- Notificar recarga de esquema
NOTIFY pgrst, 'reload schema';
