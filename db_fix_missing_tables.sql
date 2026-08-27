
-- Crear tabla de notificaciones si no existe
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    titulo TEXT,
    mensaje TEXT,
    tipo TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    leido BOOLEAN DEFAULT FALSE,
    link TEXT,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Crear tabla de auditoría si no existe
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    accion TEXT, -- 'create', 'update', 'delete', 'login', etc.
    tabla TEXT,
    registro_id TEXT,
    detalles JSONB,
    creado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (opcional, por ahora lo dejamos abierto para facilitar la depuración si el usuario lo prefiere, 
-- pero es mejor habilitarlo con políticas básicas)
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: cada usuario ve sus notificaciones
CREATE POLICY "Usuarios ven sus propias notificaciones" 
ON public.notificaciones FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sistema puede insertar notificaciones" 
ON public.notificaciones FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Usuarios pueden marcar como leídas sus notificaciones" 
ON public.notificaciones FOR UPDATE 
USING (auth.uid() = user_id);

-- Auditoría: solo lectura para admins (ejemplo simple)
CREATE POLICY "Admins ven auditoria" 
ON public.auditoria FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public."usuariosApp" 
        WHERE id = auth.uid()::text AND role = 'admin'
    )
);

CREATE POLICY "Sistema inserta en auditoria" 
ON public.auditoria FOR INSERT 
WITH CHECK (TRUE);

-- Otorgar permisos
GRANT ALL ON public.notificaciones TO authenticated;
GRANT ALL ON public.auditoria TO authenticated;
GRANT ALL ON public.notificaciones TO service_role;
GRANT ALL ON public.auditoria TO service_role;
