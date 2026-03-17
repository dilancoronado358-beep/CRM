-- ACTUALIZACIÓN DE BASE DE DATOS PARA SOPORTE DE ARCHIVOS Y CAMPOS PERSONALIZADOS
-- Ejecuta este script en el editor SQL de Supabase

-- 1. Agregar columnas a la tabla de DEALS (Oportunidades)
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS archivos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '[]'::jsonb;

-- 2. Asegurarse de que contactos tenga campo de WhatsApp vinculado
ALTER TABLE public.contactos 
ADD COLUMN IF NOT EXISTS whatsapp_id TEXT,
ADD COLUMN IF NOT EXISTS etiquetas JSONB DEFAULT '[]'::jsonb;

-- 3. Tabla para mensajes de WhatsApp (si no existe)
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

-- 4. Tabla para automatizaciones de WhatsApp (si no existe) y nuevas columnas
CREATE TABLE IF NOT EXISTS public.whatsapp_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    reply_text TEXT,
    media_url TEXT,
    start_time TEXT DEFAULT '00:00',
    end_time TEXT DEFAULT '23:59',
    delay INTEGER DEFAULT 0,
    ai_prompt TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agregar columnas individualmente si la tabla ya existe
ALTER TABLE public.whatsapp_automations ADD COLUMN IF NOT EXISTS delay INTEGER DEFAULT 0;
ALTER TABLE public.whatsapp_automations ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- 6. Nuevas columnas para anclaje a Leads
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS deal_id TEXT;

-- 6. Tabla para campos personalizados globales
CREATE TABLE IF NOT EXISTS public.campos_personalizados (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL, -- cadena, lista, fecha, dinero, etc
    opciones JSONB DEFAULT '[]'::jsonb,
    entidad TEXT DEFAULT 'deal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Habilitar Realtime para estas tablas (opcional pero recomendado)
-- alter publication supabase_realtime add table deals, contactos, whatsapp_messages, whatsapp_automations, campos_personalizados;
