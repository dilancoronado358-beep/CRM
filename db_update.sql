-- MASTER SCHEMA REPAIR - Ejecutar en el Editor SQL de Supabase
-- Este script asegura que todas las tablas y columnas necesarias existan.

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DEALS (Actualizar columnas si existen)
CREATE TABLE IF NOT EXISTS public.deals (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    "contactoId" TEXT,
    "empresaId" TEXT,
    "pipelineId" TEXT,
    "etapaId" TEXT,
    valor NUMERIC DEFAULT 0,
    prob NUMERIC DEFAULT 0,
    "fechaCierre" TEXT,
    responsable TEXT,
    creado TEXT,
    etiquetas JSONB DEFAULT '[]'::jsonb,
    notas TEXT,
    archivos JSONB DEFAULT '[]'::jsonb,
    "customFields" JSONB DEFAULT '{}'::jsonb
);

-- Asegurar columnas individuales en deals (por si la tabla ya existía)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS archivos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "contactoId" TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "empresaId" TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "pipelineId" TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "etapaId" TEXT;

-- 3. TABLA TAREAS
CREATE TABLE IF NOT EXISTS public.tareas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    prioridad TEXT DEFAULT 'media',
    estado TEXT DEFAULT 'pendiente',
    asignado TEXT,
    vencimiento TEXT,
    "contactoId" TEXT,
    "dealId" TEXT,
    descripcion TEXT,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 6. OTRAS TABLAS CORE (Si faltan)
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
    etiquetas JSONB DEFAULT '[]'::jsonb,
    whatsapp_id TEXT
);

CREATE TABLE IF NOT EXISTS public.empresas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    industria TEXT,
    sitio TEXT,
    logo TEXT,
    color TEXT
);

CREATE TABLE IF NOT EXISTS public.pipelines (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    color TEXT,
    esPrincipal BOOLEAN DEFAULT false,
    etapas JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.usuariosApp (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT,
    avatar TEXT,
    activo BOOLEAN DEFAULT true,
    "temaActivo" TEXT,
    "waServerUrl" TEXT,
    "whatsappAccess" BOOLEAN DEFAULT false
);

-- 7. Habilitar Realtime
-- alter publication supabase_realtime add table deals, tareas, campos_personalizados, contactos, whatsapp_messages;
