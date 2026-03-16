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
    chatId TEXT NOT NULL,
    body TEXT,
    fromMe BOOLEAN NOT NULL DEFAULT false,
    timestamp BIGINT,
    ack INTEGER DEFAULT 0,
    hasMedia BOOLEAN DEFAULT false,
    fileName TEXT,
    mimeType TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Habilitar Realtime para estas tablas (opcional pero recomendado)
-- alter publication supabase_realtime add table deals, contactos, whatsapp_messages;
