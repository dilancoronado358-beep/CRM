-- REPAIR SCRIPT V5: Automatic Sync Trigger (Auth to Table)
-- This is the "Professional Way" to ensure users always appear in your table.

-- 1. Ensure all columns exist in your table
ALTER TABLE public."usuariosApp" DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='creado') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "creado" TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuariosApp' AND column_name='password') THEN
        ALTER TABLE public."usuariosApp" ADD COLUMN "password" TEXT;
    END IF;
    -- (Add any others if missing according to your screenshot)
END $$;

-- 2. Create the Sync Function
-- This function runs automatically whenever a new user signs up in Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."usuariosApp" (id, name, email, role, activo, creado, password, area)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'ventas'),
    true,
    now(),
    '', -- Auth handles password security, we don't need to store it raw here
    'General'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger
-- This connects the Auth system with your "usuariosApp" table.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Reload Schema Cache for PostgREST (Optional but helpful)
NOTIFY pgrst, 'reload schema';
