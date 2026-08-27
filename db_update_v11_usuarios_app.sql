-- MASTER SCHEMA: usuariosApp (User Directory & RBAC)
-- Execute this script in your Supabase SQL Editor to enable user persistence.

CREATE TABLE IF NOT EXISTS public.usuariosApp (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT DEFAULT 'ventas', -- 'admin', 'manager', 'ventas'
    activo BOOLEAN DEFAULT true,
    whatsappAccess BOOLEAN DEFAULT false,
    area TEXT DEFAULT 'General',
    avatar TEXT,
    profilePic TEXT,
    tema TEXT DEFAULT 'light',
    waServerUrl TEXT,
    creado TIMESTAMPTZ DEFAULT now()
);

-- Ensure auto-sync can work without complex RLS for now
ALTER TABLE public.usuariosApp DISABLE ROW LEVEL SECURITY;

-- Enable Realtime for live updates across the team
-- ALTER PUBLICATION supabase_realtime ADD TABLE usuariosApp;

-- Seed initial admin if necessary (optional)
-- INSERT INTO public.usuariosApp (id, name, email, role, activo)
-- VALUES ('auth-id-here', 'Admin', 'admin@example.com', 'admin', true)
-- ON CONFLICT (id) DO NOTHING;
