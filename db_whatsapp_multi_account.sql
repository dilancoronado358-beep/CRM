-- SCHEMA: WhatsApp Multi-Canal (ULTRA-COMPATIBLE)
-- Ejecutar en el Editor SQL de Supabase para forzar el funcionamiento.

-- 1. Limpieza total
DROP TABLE IF EXISTS public.whatsapp_accounts CASCADE;

-- 2. Creación de la Tabla (Sin restricciones externas críticas para pruebas)
CREATE TABLE public.whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    user_id UUID, -- No ponemos REFERENCES para evitar errores de enlace en auth
    nombre TEXT NOT NULL,
    numero TEXT,
    activo BOOLEAN DEFAULT true,
    acceso TEXT DEFAULT 'todos',
    estado TEXT DEFAULT 'desconectado',
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Columnas adicionales en otras tablas (IF NOT EXISTS)
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.whatsapp_automations ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE public.whatsapp_automations ADD COLUMN IF NOT EXISTS org_id UUID;

-- 4. Seguridad RLS Totalmente Abierta (Temporal)
-- Esto garantiza que no haya NINGUNA restricción de guardado ahora mismo.
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir Todo Accounts" ON public.whatsapp_accounts;
CREATE POLICY "Permitir Todo Accounts" ON public.whatsapp_accounts FOR ALL USING (true) WITH CHECK (true);

-- 5. Habilitar Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'whatsapp_accounts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_accounts;
    END IF;
END $$;
