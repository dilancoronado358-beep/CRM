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
            CONTINUE;
        END IF;

        -- Desactivar RLS temporalmente para restaurar el acceso inmediato a todo el sistema
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t_actual);
        
        -- Si en el futuro lo quieren activar, ya tienen una política global de acceso total para usuarios autenticados
        EXECUTE format('DROP POLICY IF EXISTS "acceso_total_%s" ON public.%I;', t_actual, t_actual);
        EXECUTE format('
            CREATE POLICY "acceso_total_%s" 
            ON public.%I 
            FOR ALL
            USING (auth.role() = ''authenticated'');
        ', t_actual, t_actual);
        
    END LOOP;
END $$;
