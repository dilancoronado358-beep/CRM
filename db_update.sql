-- MASTER SCHEMA REPAIR V4 (ULTIMATE MIGRATION) - Ejecutar en el Editor SQL de Supabase
-- Este script estandariza todo a snake_case para evitar fallos de persistencia.

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DEALS
CREATE TABLE IF NOT EXISTS public.deals (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    contacto_id TEXT,
    empresa_id TEXT,
    pipeline_id TEXT,
    etapa_id TEXT,
    valor NUMERIC DEFAULT 0,
    prob NUMERIC DEFAULT 0,
    fecha_cierre TEXT,
    responsable TEXT,
    creado TEXT,
    etiquetas JSONB DEFAULT '[]'::jsonb,
    notas TEXT,
    archivos JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb
);

-- MIGRACIÓN Y REPARACIÓN DE COLUMNAS PARA DEALS
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS contacto_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS empresa_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS pipeline_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS etapa_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS fecha_cierre TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS archivos JSONB DEFAULT '[]'::jsonb;

-- Copiar datos de columnas antiguas (si existen) a las nuevas
UPDATE public.deals SET contacto_id = "contactoId" WHERE contacto_id IS NULL AND "contactoId" IS NOT NULL;
UPDATE public.deals SET empresa_id = "empresaId" WHERE empresa_id IS NULL AND "empresaId" IS NOT NULL;
UPDATE public.deals SET pipeline_id = "pipelineId" WHERE pipeline_id IS NULL AND "pipelineId" IS NOT NULL;
UPDATE public.deals SET etapa_id = "etapaId" WHERE etapa_id IS NULL AND "etapaId" IS NOT NULL;
UPDATE public.deals SET fecha_cierre = "fechaCierre" WHERE fecha_cierre IS NULL AND "fechaCierre" IS NOT NULL;
UPDATE public.deals SET custom_fields = "customFields" WHERE (custom_fields IS NULL OR custom_fields = '{}'::jsonb) AND "customFields" IS NOT NULL;

-- 3. TABLA TAREAS
CREATE TABLE IF NOT EXISTS public.tareas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    prioridad TEXT DEFAULT 'media',
    estado TEXT DEFAULT 'pendiente',
    asignado TEXT,
    vencimiento TEXT,
    contacto_id TEXT,
    deal_id TEXT,
    descripcion TEXT,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Reparar columnas tareas
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS contacto_id TEXT;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS deal_id TEXT;
UPDATE public.tareas SET contacto_id = "contactoId" WHERE contacto_id IS NULL AND "contactoId" IS NOT NULL;
UPDATE public.tareas SET deal_id = "dealId" WHERE deal_id IS NULL AND "dealId" IS NOT NULL;

-- 4. TABLA CAMPOS PERSONALIZADOS
CREATE TABLE IF NOT EXISTS public.campos_personalizados (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    opciones JSONB DEFAULT '[]'::jsonb,
    entidad TEXT DEFAULT 'deal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA MENSAJES WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    body TEXT,
    from_me BOOLEAN NOT NULL DEFAULT false,
    timestamp BIGINT,
    ack INTEGER DEFAULT 0,
    has_media BOOLEAN DEFAULT false,
    file_name TEXT,
    mime_type TEXT,
    deal_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. OTRAS TABLAS CORE
CREATE TABLE IF NOT EXISTS public.contactos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    empresa TEXT,
    cargo TEXT,
    estado TEXT,
    fuente TEXT,
    notas TEXT,
    avatar TEXT,
    color TEXT,
    creado TEXT,
    ultimo_contacto TEXT,
    etiquetas JSONB DEFAULT '[]'::jsonb,
    whatsapp_id TEXT
);

ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS ultimo_contacto TEXT;
UPDATE public.contactos SET ultimo_contacto = "ultimoContacto" WHERE ultimo_contacto IS NULL AND "ultimoContacto" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pipelines (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    color TEXT,
    es_principal BOOLEAN DEFAULT false,
    etapas JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.pipelines ADD COLUMN IF NOT EXISTS es_principal BOOLEAN DEFAULT false;
UPDATE public.pipelines SET es_principal = "esPrincipal" WHERE es_principal IS NULL AND "esPrincipal" IS NOT NULL;

-- 7. DESACTIVAR RLS PARA FACILITAR PERSISTENCIA (Opcional, pero recomendado para evitar fallos de permisos)
ALTER TABLE public.deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos_personalizados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- 8. Habilitar Realtime
-- alter publication supabase_realtime add table deals, tareas, campos_personalizados, contactos, whatsapp_messages;