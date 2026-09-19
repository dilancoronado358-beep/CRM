-- Ejecutar en el SQL Editor de Supabase
DO $$
DECLARE
    t_name text;
    t_actual text;
    tables_to_fix text[] := ARRAY[
        'whatsapp_accounts', 'contactos', 'deals', 'tareas', 
        'empresaConfigs', 'usuariosApp', 'empresas', 'productos', 'facturas',
        'pipelines'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_fix
    LOOP
        -- Comprobar si la tabla existe con el nombre exacto
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            t_actual := t_name;
        -- Comprobar si existe en minúsculas
        ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = lower(t_name)) THEN
            t_actual := lower(t_name);
        ELSE
            -- Si no existe, saltamos al siguiente
            CONTINUE;
        END IF;

        -- Asegurar que RLS está activo
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_actual);
        
        -- Eliminar políticas de borrado anteriores para no chocar. Usamos %s para el nombre de la política para evitar dobles comillas.
        EXECUTE format('DROP POLICY IF EXISTS "delete_policy_%s" ON public.%I;', t_actual, t_actual);
        EXECUTE format('DROP POLICY IF EXISTS "wa_accounts_delete" ON public.%I;', t_actual);
        EXECUTE format('DROP POLICY IF EXISTS "Permitir eliminar %s" ON public.%I;', t_actual, t_actual);
        EXECUTE format('DROP POLICY IF EXISTS "Permitir eliminar" ON public.%I;', t_actual);
        
        -- Crear política global de borrado
        EXECUTE format('
            CREATE POLICY "delete_policy_%s" 
            ON public.%I 
            FOR DELETE 
            USING (true);
        ', t_actual, t_actual);
    END LOOP;
END $$;
