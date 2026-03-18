-- ONE-TIME SYNC SCRIPT: Sync Existing Auth Users to "usuariosApp"
-- Run this if you have users in Auth that don't appear in the CRM list.

INSERT INTO public."usuariosApp" (id, name, email, role, activo, creado, password, area)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', email), -- Fallback to email if name is missing
  email, 
  COALESCE(raw_user_meta_data->>'role', 'ventas'), -- Fallback to 'ventas' if role is missing
  true, 
  created_at, 
  '', -- Password is secure in Auth
  'General'
FROM auth.users
ON CONFLICT (id) DO NOTHING; -- Don't overwrite existing ones

-- Re-verify RLS is off just in case
ALTER TABLE public."usuariosApp" DISABLE ROW LEVEL SECURITY;
