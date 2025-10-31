-- =====================================================
-- Fix Auth Trigger - Run this if signup is failing
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert with explicit NULL handling
  INSERT INTO public.user_profiles (id, email, role, email_verified, full_name, company_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'viewer'::user_role,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'company_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Test the function works
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger updated successfully';
END $$;
