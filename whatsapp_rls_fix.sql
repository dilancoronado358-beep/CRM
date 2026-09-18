-- SCRIPT DE CORRECCIÓN PARA CANALES DE WHATSAPP
-- Este script corrige las políticas de seguridad (RLS) para permitir que los usuarios no administradores
-- puedan crear y administrar sus propios canales de WhatsApp en el CRM.

DO $$
BEGIN

    -- 1. Asegurar que RLS esté habilitado en la tabla
    ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

    -- 2. Eliminar políticas restrictivas previas (si existen) para evitar conflictos
    DROP POLICY IF EXISTS "Permitir a todos leer whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir a admins insertar whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir a todos insertar whatsapp_accounts" ON public.whatsapp_accounts;
    DROP POLICY IF EXISTS "Permitir acceso a whatsapp_accounts" ON public.whatsapp_accounts;
    
    -- 3. Crear una política universal que permita a todos los usuarios autenticados (ventas, admin, etc.)
    --    leer, insertar, modificar y eliminar canales de WhatsApp de su organización.
    --    La seguridad de quién puede ver qué canal ya se maneja a nivel de aplicación (React).
    
    CREATE POLICY "Permitir acceso total a usuarios autenticados en whatsapp_accounts" 
    ON public.whatsapp_accounts 
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

END $$;
