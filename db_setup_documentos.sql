-- ==========================================
-- GESTIÓN DOCUMENTAL - SUPABASE SETUP API
-- ==========================================

-- 1. CREAR TABLA PRINCIPAL DE DOCUMENTOS (Ignorará si ya existe)
CREATE TABLE IF NOT EXISTS public.documentos (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  formato text NOT NULL,
  size text,
  "clienteId" text,
  fecha text,
  uploader text,
  url text,
  ruta_storage text,
  creado_at timestamp with time zone DEFAULT now(),
  org_id uuid
);

-- Habilitar Reglas de Seguridad Base de Datos (Row Level Security)
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Limpiar política si existía, crear nueva política genérica para operaciones CRUD
DROP POLICY IF EXISTS "Políticas CRM Documentos" ON public.documentos;
CREATE POLICY "Políticas CRM Documentos" ON public.documentos FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 2. CREAR NUBE DE ALMACENAMIENTO (STORAGE BUCKET)
-- ==========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-documentos',
  'crm-documentos',
  true, -- Accesible mediante URL (Descarga directa)
  5242880, -- 5 MB (5 Megabytes en bytes)
  ARRAY[
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'image/jpeg', 
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ==========================================
-- 3. PERMITIR A LA APP SUBIR Y BORRAR EN EL BUCKET (STORAGE POLICIES)
-- ==========================================

DROP POLICY IF EXISTS "Lectura Archivos Boveda" ON storage.objects;
DROP POLICY IF EXISTS "Subida Archivos Boveda" ON storage.objects;
DROP POLICY IF EXISTS "Actualización Archivos Boveda" ON storage.objects;
DROP POLICY IF EXISTS "Borrado Archivos Boveda" ON storage.objects;

-- Cualquier persona con sesión del CRM puede operar en el Bucket 'crm-documentos'
CREATE POLICY "Lectura Archivos Boveda" ON storage.objects FOR SELECT USING (bucket_id = 'crm-documentos');
CREATE POLICY "Subida Archivos Boveda" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'crm-documentos');
CREATE POLICY "Actualización Archivos Boveda" ON storage.objects FOR UPDATE USING (bucket_id = 'crm-documentos');
CREATE POLICY "Borrado Archivos Boveda" ON storage.objects FOR DELETE USING (bucket_id = 'crm-documentos');

-- Instalación finalizada: Ahora puedes subir archivos reales desde React.
