-- Agregar políticas para permitir crear y gestionar organizaciones
CREATE POLICY "Usuarios autenticados pueden crear orgs" 
    ON public.organizacion 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar orgs" 
    ON public.organizacion 
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar orgs" 
    ON public.organizacion 
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Recargar el esquema para asegurar que la caché está actualizada
NOTIFY pgrst, 'reload schema';
