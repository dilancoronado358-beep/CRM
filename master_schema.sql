-- ==========================================
-- MASTER SCHEMA CRM - FRESH INSTALL (V1)
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLES
CREATE TABLE IF NOT EXISTS public.organizacion (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.usuariosApp (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT DEFAULT 'ventas',
    avatar TEXT,
    activo BOOLEAN DEFAULT true,
    org_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    whatsappAccess BOOLEAN DEFAULT true,
    tema TEXT DEFAULT 'dark',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.contactos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    empresa TEXT,
    cargo TEXT,
    estado TEXT DEFAULT 'prospecto',
    etiquetas JSONB DEFAULT '[]'::jsonb,
    valor NUMERIC DEFAULT 0,
    avatar TEXT,
    color TEXT,
    creado TEXT,
    ultimo_contacto TEXT,
    score NUMERIC DEFAULT 0,
    fuente TEXT,
    notas TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.empresas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    industria TEXT,
    tamaño TEXT,
    sitio TEXT,
    ingresos TEXT,
    ciudad TEXT,
    logo TEXT,
    color TEXT,
    contactos JSONB DEFAULT '[]'::jsonb,
    deals JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pipelines (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    color TEXT,
    es_principal BOOLEAN DEFAULT false,
    etapas JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

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
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

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
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.actividades (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    contacto_id TEXT,
    deal_id TEXT,
    fecha TEXT,
    duracion INTEGER DEFAULT 0,
    hecho BOOLEAN DEFAULT false,
    responsable TEXT,
    notas TEXT,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notas (
    id TEXT PRIMARY KEY,
    contacto_id TEXT,
    deal_id TEXT,
    texto TEXT NOT NULL,
    autor TEXT,
    fecha TEXT,
    fijada BOOLEAN DEFAULT false,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.campos_personalizados (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    opciones JSONB DEFAULT '[]'::jsonb,
    entidad TEXT DEFAULT 'deal',
    orden INTEGER DEFAULT 0,
    seccion TEXT DEFAULT 'avanzado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    qr_code TEXT,
    session_data JSONB,
    assigned_users JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.emails (
    id TEXT PRIMARY KEY,
    carpeta TEXT DEFAULT 'entrada',
    "de" TEXT,
    para TEXT,
    asunto TEXT,
    cuerpo TEXT,
    fecha TEXT,
    leido BOOLEAN DEFAULT false,
    contacto_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.plantillasEmail (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    asunto TEXT,
    cuerpo TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.productos (
    id TEXT PRIMARY KEY,
    sku TEXT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC DEFAULT 0,
    categoria TEXT,
    activo BOOLEAN DEFAULT true,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.facturas (
    id TEXT PRIMARY KEY,
    deal_id TEXT,
    cliente_nombre TEXT,
    fecha_emision TEXT,
    fecha_vencimiento TEXT,
    subtotal NUMERIC DEFAULT 0,
    impuestos NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    estado TEXT DEFAULT 'borrador',
    items JSONB DEFAULT '[]'::jsonb,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.documentos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    url TEXT,
    tamaño INTEGER,
    deal_id TEXT,
    contacto_id TEXT,
    empresa_id TEXT,
    subido_por TEXT,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.landing_pages (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE,
    contenido JSONB,
    config JSONB DEFAULT '{}'::jsonb,
    activa BOOLEAN DEFAULT false,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.landing_leads (
    id TEXT PRIMARY KEY,
    landing_id TEXT,
    datos JSONB,
    convertido BOOLEAN DEFAULT false,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ventas_metas (
    id TEXT PRIMARY KEY,
    usuario_id TEXT,
    mes TEXT,
    meta_monto NUMERIC DEFAULT 0,
    meta_deals INTEGER DEFAULT 0,
    logrado_monto NUMERIC DEFAULT 0,
    logrado_deals INTEGER DEFAULT 0,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.finanzas_comisiones (
    id TEXT PRIMARY KEY,
    deal_id TEXT,
    usuario_id TEXT,
    monto_base NUMERIC DEFAULT 0,
    porcentaje NUMERIC DEFAULT 0,
    monto_comision NUMERIC DEFAULT 0,
    estado TEXT DEFAULT 'pendiente',
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.sales_playbook (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    etapa_id TEXT,
    contenido TEXT,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.auditoria (
    id TEXT PRIMARY KEY,
    entidad TEXT,
    entidad_id TEXT,
    accion TEXT,
    usuario_id TEXT,
    detalles JSONB,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notificaciones (
    id TEXT PRIMARY KEY,
    usuario_id TEXT,
    tipo TEXT,
    titulo TEXT,
    mensaje TEXT,
    leida BOOLEAN DEFAULT false,
    link TEXT,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.whatsapp_automations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. DISABLE ROW LEVEL SECURITY (For easy initial setup)
-- This ensures everything works out of the box. You can enable RLS later in Supabase Dashboard if needed.
ALTER TABLE public.organizacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuariosApp DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos_personalizados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillasEmail DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_metas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzas_comisiones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_playbook DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automations DISABLE ROW LEVEL SECURITY;

-- 4. INSERT DEFAULT MASTER ADMIN (You can login with this instantly)
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert into auth.users (id MUST be a valid UUID)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@ensing.lat',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Administrador ENSING", "role": "admin"}',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'admin@ensing.lat')::jsonb,
    'email',
    now(),
    now(),
    now()
) ON CONFLICT DO NOTHING;

INSERT INTO public.usuariosApp (id, name, email, password, role, avatar, activo, org_id) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Administrador ENSING', 'admin@ensing.lat', 'admin123', 'admin', 'AD', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- INSERT DEFAULT PIPELINE
INSERT INTO public.pipelines (id, nombre, color, es_principal, etapas)
VALUES (
  'pl1', 
  'Ventas B2B', 
  '#0d9488', 
  true, 
  '[{"id": "et1", "color": "rgba(255,255,255,0.4)", "orden": 0, "nombre": "Nuevo Lead", "probabilidad": 10}, {"id": "et2", "color": "#60A5FA", "orden": 1, "nombre": "Calificado", "probabilidad": 25}, {"id": "et3", "color": "#A78BFA", "orden": 2, "nombre": "Propuesta", "probabilidad": 50}, {"id": "et4", "color": "#F59E0B", "orden": 3, "nombre": "Negociación", "probabilidad": 75}, {"id": "et5", "color": "#10B981", "orden": 4, "nombre": "Ganado", "es_ganado": true, "probabilidad": 100}, {"id": "et6", "color": "#EF4444", "orden": 5, "nombre": "Perdido", "es_perdido": true, "probabilidad": 0}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- DONE!
