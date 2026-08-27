-- MIGRACIÓN MULTI-TENANCY CRM V1

-- 1. Crear tabla de Organizaciones si no existe
CREATE TABLE IF NOT EXISTS public.organizacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE,
    wa_server_url TEXT,
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Asegurar que existe al menos una organización por defecto para migrar datos existentes
INSERT INTO public.organizacion (id, nombre, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Organización Principal', 'principal')
ON CONFLICT (id) DO NOTHING;

-- 3. Lista de tablas a las que añadir org_id
-- deals, tareas, campos_personalizados, contactos, whatsapp_messages, empresas, 
-- actividades, emails, email_accounts, notas, productos, plantillasEmail,
-- automatizaciones, whatsapp_automations, finanzas_gastos, finanzas_comisiones,
-- notificaciones, auditoria, api_settings, webhook_subscriptions, landing_pages,
-- formularios_publicos, documentos, pipelines

DO $$ 
DECLARE 
    t TEXT;
    tablas TEXT[] := ARRAY[
        'deals', 'tareas', 'campos_personalizados', 'contactos', 'whatsapp_messages', 
        'empresas', 'actividades', 'emails', 'email_accounts', 'notas', 'productos', 
        'plantillasEmail', 'automatizaciones', 'whatsapp_automations', 'finanzas_gastos', 
        'finanzas_comisiones', 'notificaciones', 'auditoria', 'api_settings', 
        'webhook_subscriptions', 'landing_pages', 'formularios_publicos', 'documentos', 
        'pipelines', 'usuariosApp'
    ];
BEGIN 
    FOREACH t IN ARRAY tablas LOOP
        -- Añadir columna org_id si no existe
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizacion(id) DEFAULT ''00000000-0000-0000-0000-000000000001''', t);
        
        -- Crear índice para rendimiento en búsquedas por org (Corregido para manejar mayúsculas)
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (org_id)', t || '_org_id_idx', t);
        
        -- Habilitar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 4. POLÍTICAS DE RLS (SEGURIDAD TOTAL)
DO $$ 
DECLARE 
    t TEXT;
    tablas TEXT[] := ARRAY[
        'deals', 'tareas', 'campos_personalizados', 'contactos', 'whatsapp_messages', 
        'empresas', 'actividades', 'emails', 'email_accounts', 'notas', 'productos', 
        'plantillasEmail', 'automatizaciones', 'whatsapp_automations', 'finanzas_gastos', 
        'finanzas_comisiones', 'notificaciones', 'auditoria', 'api_settings', 
        'webhook_subscriptions', 'landing_pages', 'formularios_publicos', 'documentos', 
        'pipelines', 'usuariosApp'
    ];
BEGIN 
    FOREACH t IN ARRAY tablas LOOP
        -- Eliminar políticas antiguas si existen
        EXECUTE format('DROP POLICY IF EXISTS "Aislamiento por Org" ON public.%I', t);
        
        -- Crear política (Corregido para manejar mayúsculas)
        EXECUTE format('
            CREATE POLICY "Aislamiento por Org" ON public.%I
            FOR ALL
            USING (org_id = (auth.jwt() -> ''user_metadata'' ->> ''org_id'')::uuid)
            WITH CHECK (org_id = (auth.jwt() -> ''user_metadata'' ->> ''org_id'')::uuid)
        ', t);
    END LOOP;
END $$;

-- 5. Casos Especiales (Organizacion propia)
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cualquier usuario logueado ve la lista de orgs" ON public.organizacion;
DROP POLICY IF EXISTS "Usuarios ven su propia org" ON public.organizacion;

-- NUEVA POLÍTICA: Todo usuario autenticado puede ver el listado de organizaciones
CREATE POLICY "Cualquier usuario logueado ve la lista de orgs" 
    ON public.organizacion 
    FOR SELECT 
    USING (auth.role() = 'authenticated');



-- 6. Trigger para auto-provisionamiento de usuariosApp
-- Este trigger asegura que cada vez que se crea un usuario en la tabla interna de Supabase (Auth),
-- se cree automáticamente el registro correspondiente en nuestra tabla pública 'usuariosApp'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."usuariosApp" (id, name, email, role, org_id, activo)
  VALUES (
    new.id::text,
    COALESCE(new.raw_user_meta_data->>'name', 'Nuevo Usuario'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'ventas'),
    (new.raw_user_meta_data->>'org_id')::uuid,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    org_id = EXCLUDED.org_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si ya existe para evitar errores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger en la tabla de sistema auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Sincronizar org_id para usuarios existentes en auth.users si no lo tienen en usuariosApp
UPDATE public."usuariosApp" u
SET org_id = (a.raw_user_meta_data->>'org_id')::uuid
FROM auth.users a
WHERE u.id::text = a.id::text AND u.org_id IS NULL AND a.raw_user_meta_data->>'org_id' IS NOT NULL;

-- 7. SINCRONIZACIÓN DE METADATOS DE SEGURIDAD (CRÍTICO)
-- Asegura que el org_id esté presente en auth.users para que las políticas RLS funcionen.
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('org_id', (SELECT org_id FROM public."usuariosApp" WHERE id::text = auth.users.id::text LIMIT 1))
WHERE id IN (SELECT id::uuid FROM public."usuariosApp" WHERE org_id IS NOT NULL);



