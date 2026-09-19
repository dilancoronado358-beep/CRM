-- Confirmar manualmente el usuario específico si existe
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'kattychama1807@gmail.com' AND email_confirmed_at IS NULL;

-- Crear funcion para auto confirmar futuros usuarios
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asignar el trigger a auth.users
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();
